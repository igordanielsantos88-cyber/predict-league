BEGIN;

ALTER TABLE public.matches ADD COLUMN football_data_match_id bigint,
  ADD COLUMN football_data_competition text;
CREATE UNIQUE INDEX matches_football_data_id_idx ON public.matches(season_id, football_data_match_id)
  WHERE football_data_match_id IS NOT NULL;

CREATE TABLE public.calendar_sync_settings (
  season_id uuid PRIMARY KEY REFERENCES public.seasons(id) ON DELETE CASCADE,
  season_year integer NOT NULL CHECK (season_year BETWEEN 2000 AND 2100),
  round_offset integer NOT NULL DEFAULT 0 CHECK (round_offset BETWEEN -33 AND 100),
  enabled boolean NOT NULL DEFAULT false,
  last_source_at timestamptz,
  last_sync_at timestamptz,
  last_report jsonb
);
ALTER TABLE public.calendar_sync_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.calendar_sync_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.calendar_sync_settings TO service_role;
GRANT SELECT ON TABLE public.seasons TO service_role;

CREATE FUNCTION public.pode_gerir_calendario()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin' AND p.approval_status = 'approved');
$function$;

CREATE FUNCTION public.obter_config_calendario(p_epoca uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NOT public.pode_gerir_calendario() THEN
    RAISE EXCEPTION 'Calendário reservado a administradores.' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT to_jsonb(c) FROM public.calendar_sync_settings c WHERE c.season_id = p_epoca);
END;
$function$;

CREATE FUNCTION public.guardar_config_calendario(p_epoca uuid, p_ano integer, p_desvio integer, p_ativo boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_conf public.calendar_sync_settings%ROWTYPE;
BEGIN
  IF NOT public.pode_gerir_calendario() THEN
    RAISE EXCEPTION 'Calendário reservado a administradores.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.seasons s WHERE s.id = p_epoca AND s.status = 'active') THEN
    RAISE EXCEPTION 'Seleciona uma época ativa.';
  END IF;
  PERFORM 1 FROM public.calendar_sync_settings c WHERE c.season_id = p_epoca FOR UPDATE;
  IF EXISTS (
    SELECT 1 FROM public.calendar_sync_settings c JOIN public.matches m ON m.season_id = c.season_id
    WHERE c.season_id = p_epoca AND m.football_data_competition = 'PPL'
      AND (c.season_year, c.round_offset) IS DISTINCT FROM (p_ano, p_desvio)
  ) THEN
    RAISE EXCEPTION 'A época e o desvio não podem mudar depois de associar jogos.';
  END IF;
  INSERT INTO public.calendar_sync_settings (season_id, season_year, round_offset, enabled)
  VALUES (p_epoca, p_ano, p_desvio, p_ativo)
  ON CONFLICT (season_id) DO UPDATE SET season_year = EXCLUDED.season_year,
    round_offset = EXCLUDED.round_offset, enabled = EXCLUDED.enabled
  RETURNING * INTO v_conf;
  RETURN to_jsonb(v_conf);
END;
$function$;

CREATE FUNCTION public.normalizar_equipa_calendario(p_nome text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $function$
  SELECT regexp_replace(translate(lower(p_nome), 'áàâãäéèêëíìîïóòôõöúùûüç',
    'aaaaaeeeeiiiiooooouuuuc'), '[^a-z0-9]', '', 'g');
$function$;

CREATE FUNCTION public.aplicar_calendario_liga_portugal(
  p_epoca uuid, p_ano integer, p_desvio integer, p_jogos jsonb, p_previa boolean, p_agendado boolean,
  p_fonte_em timestamptz
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_conf public.calendar_sync_settings%ROWTYPE;
  v_epoca public.seasons%ROWTYPE;
  v_jogo record;
  v_local public.matches%ROWTYPE;
  v_candidatos uuid[];
  v_jornadas uuid[];
  v_jornada uuid;
  v_numero integer;
  v_acao text;
  v_motivo text;
  v_agora timestamptz := now();
  v_detalhes jsonb := '[]'::jsonb;
  v_relatorio jsonb;
BEGIN
  IF p_previa IS NULL OR p_agendado IS NULL OR p_fonte_em IS NULL THEN
    RAISE EXCEPTION 'Parâmetros da sincronização inválidos.';
  END IF;
  IF jsonb_typeof(p_jogos) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Calendário inválido.';
  END IF;
  IF jsonb_array_length(p_jogos) > 360 THEN
    RAISE EXCEPTION 'Calendário inválido.';
  END IF;
  SELECT * INTO STRICT v_conf FROM public.calendar_sync_settings c
  WHERE c.season_id = p_epoca FOR UPDATE;
  IF (v_conf.season_year, v_conf.round_offset) IS DISTINCT FROM (p_ano, p_desvio)
    OR (p_agendado AND NOT v_conf.enabled) THEN
    RAISE EXCEPTION 'A configuração do calendário mudou.';
  END IF;
  SELECT * INTO STRICT v_epoca FROM public.seasons s WHERE s.id = p_epoca AND s.status = 'active';

  IF NOT p_previa THEN
    IF v_conf.last_source_at >= p_fonte_em THEN
      RETURN jsonb_build_object('previa', false, 'jogos', '[]'::jsonb, 'sincronizadoEm', v_conf.last_sync_at);
    END IF;
    LOCK TABLE public.jornadas, public.matches IN SHARE ROW EXCLUSIVE MODE;
    v_agora := clock_timestamp();
  END IF;
  FOR v_jogo IN SELECT * FROM jsonb_to_recordset(p_jogos) AS fonte(
    id bigint, ronda integer, hora timestamptz, estado text, casa text, fora text, casas text[], foras text[]
  ) ORDER BY hora, id
  LOOP
    v_numero := v_jogo.ronda + v_conf.round_offset;
    IF v_numero < 1 THEN CONTINUE; END IF;
    v_acao := NULL;
    v_motivo := NULL;
    SELECT * INTO v_local FROM public.matches m
    WHERE m.season_id = p_epoca AND m.football_data_match_id = v_jogo.id;

    IF v_local.id IS NULL AND (v_jogo.estado <> 'TIMED' OR v_jogo.hora <= v_agora
      OR v_jogo.hora > v_agora + interval '45 days') THEN CONTINUE; END IF;
    IF v_local.id IS NOT NULL AND v_local.status IS DISTINCT FROM 'scheduled' THEN CONTINUE; END IF;
    IF v_local.id IS NOT NULL AND v_jogo.estado = 'FINISHED' THEN CONTINUE; END IF;

    IF v_jogo.estado <> 'TIMED' OR v_jogo.hora <= v_agora THEN
      IF v_jogo.estado IN ('POSTPONED', 'CANCELLED') THEN
        v_motivo := 'O fornecedor adiou ou cancelou o jogo sem nova data confirmada.';
      END IF;
    ELSIF v_local.id IS NOT NULL THEN
      IF v_local.kickoff IS DISTINCT FROM v_jogo.hora THEN
        IF v_local.kickoff <= v_agora THEN
          v_motivo := 'O prazo anterior já fechou. Revê a alteração da hora.';
        ELSE
          v_acao := 'atualizado';
          IF NOT p_previa THEN
            UPDATE public.matches SET kickoff = v_jogo.hora WHERE id = v_local.id;
          END IF;
        END IF;
      END IF;
    ELSE
      SELECT array_agg(j.id) INTO v_jornadas
      FROM public.jornadas j WHERE j.season_id = p_epoca AND j.numero = v_numero;
      v_jornada := v_jornadas[1];

      SELECT array_agg(m.id) INTO v_candidatos FROM public.matches m
      WHERE m.season_id = p_epoca AND m.football_data_match_id IS NULL
        AND public.normalizar_equipa_calendario(m.home_team) = ANY(v_jogo.casas)
        AND public.normalizar_equipa_calendario(m.away_team) = ANY(v_jogo.foras);

      IF cardinality(v_jornadas) > 1 OR cardinality(v_candidatos) > 1 THEN
        v_motivo := 'Há mais de uma jornada ou jogo que corresponde a este registo.';
      ELSIF cardinality(v_candidatos) = 1 THEN
        SELECT * INTO STRICT v_local FROM public.matches WHERE id = v_candidatos[1];
        IF v_local.status IS DISTINCT FROM 'scheduled' OR v_local.kickoff <= v_agora THEN
          v_motivo := 'O jogo existente já começou ou tem resultado.';
        ELSE
          v_acao := 'associado';
          IF NOT p_previa THEN
            UPDATE public.matches
            SET football_data_match_id = v_jogo.id, football_data_competition = 'PPL', kickoff = v_jogo.hora WHERE id = v_local.id;
          END IF;
        END IF;
      ELSIF EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.season_id = p_epoca AND m.football_data_match_id IS NULL AND (
          m.jornada_id = v_jornada OR (
            m.kickoff BETWEEN v_jogo.hora - interval '1 day' AND v_jogo.hora + interval '1 day'
            AND (public.normalizar_equipa_calendario(m.home_team) = ANY(v_jogo.casas)
              OR public.normalizar_equipa_calendario(m.away_team) = ANY(v_jogo.foras))
          ))
      ) THEN
        v_motivo := 'Há jogos manuais sem correspondência segura nesta jornada ou data.';
      ELSE
        v_acao := 'criado';
        IF NOT p_previa THEN
          IF v_jornada IS NULL THEN
            INSERT INTO public.jornadas (competition_id, season_id, numero, nome)
            VALUES (v_epoca.competition_id, p_epoca, v_numero, 'Jornada ' || v_numero)
            RETURNING id INTO v_jornada;
          END IF;
          INSERT INTO public.matches (competition_id, season_id, jornada_id, home_team, away_team, kickoff,
            is_bonus, football_data_match_id, football_data_competition)
          VALUES (v_epoca.competition_id, p_epoca, v_jornada, v_jogo.casa, v_jogo.fora, v_jogo.hora, false, v_jogo.id, 'PPL');
        END IF;
      END IF;
    END IF;

    IF v_acao IS NOT NULL OR v_motivo IS NOT NULL THEN
      v_detalhes := v_detalhes || jsonb_build_array(jsonb_build_object(
        'id', v_jogo.id, 'casa', v_jogo.casa, 'fora', v_jogo.fora, 'hora', v_jogo.hora,
        'jornada', v_numero, 'acao', COALESCE(v_acao, 'rever'), 'motivo', v_motivo));
    END IF;
  END LOOP;
  v_relatorio := jsonb_build_object('previa', p_previa, 'jogos', v_detalhes,
    'sincronizadoEm', CASE WHEN NOT p_previa THEN v_agora END);
  IF NOT p_previa THEN
    UPDATE public.calendar_sync_settings SET last_source_at = p_fonte_em, last_sync_at = v_agora, last_report = v_relatorio
    WHERE season_id = p_epoca;
  END IF;
  RETURN v_relatorio;
END;
$function$;

CREATE FUNCTION public.solicitar_calendario_liga_portugal()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_chave text; v_config record;
BEGIN
  SELECT decrypted_secret INTO v_chave FROM vault.decrypted_secrets WHERE name = 'CALENDAR_CRON_SECRET';
  IF v_chave IS NULL OR v_chave !~ '^[0-9a-f]{64}$' THEN RETURN; END IF;

  FOR v_config IN SELECT c.season_id FROM public.calendar_sync_settings c
    JOIN public.seasons s ON s.id = c.season_id AND s.status = 'active' WHERE c.enabled
  LOOP
    PERFORM net.http_post(
      url := 'https://lipnsydupzsjdgwhpmgl.supabase.co/functions/v1/sincronizar-calendario',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-calendar-cron-secret', v_chave),
      body := jsonb_build_object('epocaId', v_config.season_id),
      timeout_milliseconds := 60000);
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.pode_gerir_calendario(), public.normalizar_equipa_calendario(text),
  public.obter_config_calendario(uuid), public.guardar_config_calendario(uuid,integer,integer,boolean),
  public.aplicar_calendario_liga_portugal(uuid,integer,integer,jsonb,boolean,boolean,timestamptz),
  public.solicitar_calendario_liga_portugal() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obter_config_calendario(uuid),
  public.guardar_config_calendario(uuid,integer,integer,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_calendario_liga_portugal(uuid,integer,integer,jsonb,boolean,boolean,timestamptz) TO service_role;

SELECT cron.schedule('predict-league-calendario', '15 * * * *',
  'SELECT public.solicitar_calendario_liga_portugal();');

COMMIT;
