BEGIN;

ALTER TABLE public.calendar_team_aliases ADD COLUMN IF NOT EXISTS crest text
  CHECK (crest ~ '^https://crests[.]football-data[.]org/[A-Za-z0-9_-]{1,100}[.](svg|png|webp)$');

ALTER TABLE public.matches ADD COLUMN home_crest_competition text, ADD COLUMN away_crest_competition text;

CREATE FUNCTION public.emblema_alias_calendario(p_nome text, p_competicao text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT CASE WHEN count(DISTINCT crest) = 1 THEN min(crest) END
  FROM public.calendar_team_aliases
  WHERE alias = public.normalizar_equipa_calendario(p_nome)
    AND (p_competicao IS NULL OR competition_code = p_competicao)
    AND NOT ambiguous;
$function$;

CREATE FUNCTION public.aplicar_alias_emblema_calendario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.home_team IS DISTINCT FROM OLD.home_team THEN
      NEW.home_crest_competition := NULL;
      IF NEW.home_crest IS NOT DISTINCT FROM OLD.home_crest THEN NEW.home_crest := NULL; END IF;
    END IF;
    IF NEW.away_team IS DISTINCT FROM OLD.away_team THEN
      NEW.away_crest_competition := NULL;
      IF NEW.away_crest IS NOT DISTINCT FROM OLD.away_crest THEN NEW.away_crest := NULL; END IF;
    END IF;
  END IF;
  IF NEW.home_crest IS NULL OR COALESCE(NEW.football_data_competition, NEW.home_crest_competition) IS NOT NULL THEN
    NEW.home_crest := COALESCE(public.emblema_alias_calendario(NEW.home_team,
      COALESCE(NEW.football_data_competition, NEW.home_crest_competition)), NEW.home_crest);
  END IF;
  IF NEW.away_crest IS NULL OR COALESCE(NEW.football_data_competition, NEW.away_crest_competition) IS NOT NULL THEN
    NEW.away_crest := COALESCE(public.emblema_alias_calendario(NEW.away_team,
      COALESCE(NEW.football_data_competition, NEW.away_crest_competition)), NEW.away_crest);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER aplicar_alias_emblema_calendario
BEFORE INSERT OR UPDATE OF home_team, away_team, home_crest, away_crest, football_data_competition ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.aplicar_alias_emblema_calendario();

CREATE FUNCTION public.guardar_alias_emblema_calendario(
  p_epoca uuid, p_jogo uuid, p_lado text, p_competicao text, p_nome text, p_oficial text, p_emblema text
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_jogo public.matches%ROWTYPE;
  v_alias text := public.normalizar_equipa_calendario(p_nome);
  v_oficial text := public.normalizar_equipa_calendario(p_oficial);
  v_emblema_anterior text;
  v_alterados integer;
BEGIN
  IF p_lado IS NULL OR p_lado NOT IN ('casa', 'fora')
    OR p_competicao IS NULL OR p_competicao NOT IN ('PL','PD','SA','BL1','FL1','PPL','CL','EL','UECL')
    OR COALESCE(v_alias, '') = '' OR COALESCE(v_oficial, '') = '' OR p_emblema IS NULL THEN
    RAISE EXCEPTION 'Correspondência inválida.';
  END IF;

  -- Serializa correções com nomes iguais, incluindo em jogos de outras épocas.
  PERFORM pg_advisory_xact_lock(hashtextextended('predict-league-alias:' || v_alias, 0));
  SELECT m.* INTO STRICT v_jogo FROM public.matches m JOIN public.seasons s ON s.id = m.season_id
    WHERE m.id = p_jogo AND s.id = p_epoca AND s.status = 'active' FOR UPDATE OF m;
  IF (CASE WHEN p_lado = 'casa' THEN v_jogo.home_team ELSE v_jogo.away_team END) IS DISTINCT FROM p_nome
    OR (v_jogo.football_data_competition IS NOT NULL AND v_jogo.football_data_competition <> p_competicao) THEN
    RAISE EXCEPTION 'O jogo mudou. Atualiza a jornada.';
  END IF;

  v_emblema_anterior := public.emblema_alias_calendario(p_nome, NULL);
  INSERT INTO public.calendar_team_aliases (competition_code, alias, official_name, crest, ambiguous)
    VALUES (p_competicao, v_alias, v_oficial, p_emblema, false)
    ON CONFLICT (competition_code, alias) DO UPDATE
      SET official_name = EXCLUDED.official_name, crest = EXCLUDED.crest, ambiguous = false;

  -- Se o nome representar clubes diferentes, os jogos sem competição precisam de uma escolha individual.
  UPDATE public.matches m
    SET home_crest_competition = CASE WHEN m.id = p_jogo AND p_lado = 'casa'
          THEN p_competicao ELSE m.home_crest_competition END,
        away_crest_competition = CASE WHEN m.id = p_jogo AND p_lado = 'fora'
          THEN p_competicao ELSE m.away_crest_competition END,
        home_crest = CASE
          WHEN m.id = p_jogo AND p_lado = 'casa' THEN p_emblema
          WHEN m.football_data_competition IS NULL AND m.home_crest_competition IS NULL AND m.home_crest = v_emblema_anterior
            AND public.normalizar_equipa_calendario(m.home_team) = v_alias THEN NULL
          ELSE m.home_crest END,
        away_crest = CASE
          WHEN m.id = p_jogo AND p_lado = 'fora' THEN p_emblema
          WHEN m.football_data_competition IS NULL AND m.away_crest_competition IS NULL AND m.away_crest = v_emblema_anterior
            AND public.normalizar_equipa_calendario(m.away_team) = v_alias THEN NULL
          ELSE m.away_crest END
    WHERE m.id = p_jogo OR (
      (m.football_data_competition IS NULL OR m.football_data_competition = p_competicao)
      AND v_alias IN (public.normalizar_equipa_calendario(m.home_team), public.normalizar_equipa_calendario(m.away_team))
    );

  GET DIAGNOSTICS v_alterados = ROW_COUNT;
  RETURN v_alterados;
END;
$function$;

CREATE TABLE public.calendar_result_reviews (
  match_id uuid PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
  source_match_id bigint NOT NULL,
  checked_at timestamptz NOT NULL,
  home_score integer CHECK (home_score >= 0),
  away_score integer CHECK (away_score >= 0),
  extra_time boolean,
  CHECK ((home_score IS NULL) = (away_score IS NULL))
);
ALTER TABLE public.calendar_result_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calendar_result_reviews FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.reservar_marcadores_calendario(p_epoca uuid DEFAULT NULL)
RETURNS TABLE (jogo_id uuid, fornecedor_id bigint, consultado_em timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_limite integer;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtextextended('predict-league-marcadores', 0)) THEN RETURN; END IF;
  SELECT GREATEST(0, 6 - count(*)) INTO v_limite
  FROM public.calendar_result_reviews r WHERE r.checked_at > now() - interval '1 minute';
  IF v_limite = 0 THEN RETURN; END IF;

  RETURN QUERY WITH candidatos AS (
    SELECT m.id, m.football_data_match_id
    FROM public.matches m
    JOIN public.seasons s ON s.id = m.season_id AND s.status = 'active'
    LEFT JOIN public.calendar_result_reviews r
      ON r.match_id = m.id AND r.source_match_id = m.football_data_match_id
    WHERE (p_epoca IS NULL OR s.id = p_epoca)
      AND m.football_data_match_id IS NOT NULL AND m.jornada_id IS NOT NULL
      AND m.kickoff <= now() - interval '90 minutes'
      AND (m.status = 'scheduled' OR (m.status = 'finished' AND (m.home_score IS NULL OR m.away_score IS NULL)))
      AND r.home_score IS NULL
      AND (r.checked_at IS NULL OR r.checked_at < now() - interval '15 minutes')
    ORDER BY r.checked_at NULLS FIRST, m.kickoff DESC, m.id
    LIMIT v_limite FOR UPDATE OF m SKIP LOCKED
  )
  INSERT INTO public.calendar_result_reviews AS r (match_id, source_match_id, checked_at)
    SELECT c.id, c.football_data_match_id, now() FROM candidatos c
  ON CONFLICT (match_id) DO UPDATE SET source_match_id = EXCLUDED.source_match_id,
    checked_at = EXCLUDED.checked_at, home_score = NULL, away_score = NULL, extra_time = NULL
    WHERE r.source_match_id <> EXCLUDED.source_match_id
      OR (r.home_score IS NULL AND r.checked_at < now() - interval '15 minutes')
  RETURNING r.match_id, r.source_match_id, r.checked_at;
END;
$function$;

CREATE FUNCTION public.guardar_marcador_calendario(
  p_jogo uuid, p_fornecedor bigint, p_consultado_em timestamptz, p_casa integer, p_fora integer, p_desempate boolean
) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $function$
  WITH guardado AS (
    UPDATE public.calendar_result_reviews r
    SET home_score = p_casa, away_score = p_fora, extra_time = p_desempate
    WHERE r.match_id = p_jogo AND r.source_match_id = p_fornecedor AND r.checked_at = p_consultado_em
      AND r.home_score IS NULL AND p_casa >= 0 AND p_fora >= 0
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM guardado);
$function$;

CREATE FUNCTION public.obter_marcadores_por_rever(p_epoca uuid)
RETURNS TABLE (jogo_id uuid, fornecedor_id bigint, casa integer, fora integer, houve_desempate boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NOT public.pode_gerir_calendario() THEN
    RAISE EXCEPTION 'Marcadores reservados a administradores.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT m.id, r.source_match_id, r.home_score, r.away_score, r.extra_time
    FROM public.calendar_result_reviews r JOIN public.matches m
      ON m.id = r.match_id AND m.football_data_match_id = r.source_match_id
    JOIN public.seasons s ON s.id = m.season_id AND s.status = 'active'
    WHERE s.id = p_epoca AND m.jornada_id IS NOT NULL AND m.kickoff <= now()
      AND r.home_score IS NOT NULL
      AND (m.status = 'scheduled' OR (m.status = 'finished' AND (m.home_score IS NULL OR m.away_score IS NULL)))
    ORDER BY m.kickoff DESC, m.id;
END;
$function$;

CREATE FUNCTION public.solicitar_marcadores_calendario()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_chave text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.matches m JOIN public.seasons s ON s.id = m.season_id AND s.status = 'active'
    LEFT JOIN public.calendar_result_reviews r ON r.match_id = m.id AND r.source_match_id = m.football_data_match_id
    WHERE m.football_data_match_id IS NOT NULL AND m.jornada_id IS NOT NULL
      AND m.kickoff <= now() - interval '90 minutes'
      AND (m.status = 'scheduled' OR (m.status = 'finished' AND (m.home_score IS NULL OR m.away_score IS NULL)))
      AND r.home_score IS NULL AND (r.checked_at IS NULL OR r.checked_at < now() - interval '15 minutes')
  ) THEN RETURN; END IF;

  SELECT decrypted_secret INTO v_chave FROM vault.decrypted_secrets WHERE name = 'CALENDAR_CRON_SECRET';
  IF v_chave IS NULL OR v_chave !~ '^[0-9a-f]{64}$' THEN RETURN; END IF;
  PERFORM net.http_post(
    url := 'https://lipnsydupzsjdgwhpmgl.supabase.co/functions/v1/sincronizar-calendario',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-calendar-cron-secret', v_chave),
    body := '{"acao":"recolher-marcadores"}'::jsonb,
    timeout_milliseconds := 60000);
END;
$function$;

REVOKE ALL ON FUNCTION public.emblema_alias_calendario(text,text), public.aplicar_alias_emblema_calendario(),
  public.guardar_alias_emblema_calendario(uuid,uuid,text,text,text,text,text),
  public.reservar_marcadores_calendario(uuid), public.guardar_marcador_calendario(uuid,bigint,timestamptz,integer,integer,boolean),
  public.obter_marcadores_por_rever(uuid), public.solicitar_marcadores_calendario()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guardar_alias_emblema_calendario(uuid,uuid,text,text,text,text,text),
  public.reservar_marcadores_calendario(uuid), public.guardar_marcador_calendario(uuid,bigint,timestamptz,integer,integer,boolean)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.obter_marcadores_por_rever(uuid) TO authenticated;

SELECT cron.schedule('predict-league-marcadores', '2-59/5 * * * *',
  'SELECT public.solicitar_marcadores_calendario();');

COMMIT;
