BEGIN;

CREATE OR REPLACE FUNCTION public.importar_jogos_selecionados(
  p_epoca uuid, p_jornada uuid, p_competicao text, p_jogos jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_competicao uuid;
  v_jogo record;
  v_local public.matches%ROWTYPE;
  v_original public.matches%ROWTYPE;
  v_candidatos uuid[];
  v_agora timestamptz;
  v_acao text;
  v_detalhes jsonb := '[]'::jsonb;
BEGIN
  IF p_competicao IS NULL OR p_competicao NOT IN ('PL','PD','SA','BL1','FL1','PPL','CL','EL','UECL')
    OR jsonb_typeof(p_jogos) IS DISTINCT FROM 'array' OR jsonb_array_length(p_jogos) NOT BETWEEN 1 AND 40 THEN
    RAISE EXCEPTION 'Seleção de jogos inválida.';
  END IF;

  LOCK TABLE public.jornadas, public.matches, public.predictions IN SHARE ROW EXCLUSIVE MODE;
  SELECT j.competition_id INTO STRICT v_competicao FROM public.jornadas j
  JOIN public.seasons s ON s.id = j.season_id AND s.competition_id = j.competition_id AND s.status = 'active'
  WHERE j.id = p_jornada AND j.season_id = p_epoca;

  v_agora := clock_timestamp();
  FOR v_jogo IN SELECT * FROM jsonb_to_recordset(p_jogos) AS fonte(
    id bigint, hora timestamptz, estado text, casa text, fora text, casas text[], foras text[], destino uuid, novo boolean, manter_importado boolean
  ) ORDER BY hora, id
  LOOP
    IF v_jogo.estado IS DISTINCT FROM 'TIMED' OR v_jogo.hora IS NULL OR
      v_jogo.hora <= v_agora OR v_jogo.hora > v_agora + interval '45 days' THEN
      v_acao := 'indisponivel';
    ELSE
      SELECT * INTO v_local FROM public.matches m
      WHERE m.season_id = p_epoca AND m.football_data_match_id = v_jogo.id;
      IF v_jogo.destino IS NOT NULL THEN
        SELECT * INTO v_original FROM public.matches m
        WHERE m.id = v_jogo.destino AND m.season_id = p_epoca AND m.jornada_id = p_jornada;

        IF v_jogo.manter_importado IS TRUE THEN
          IF v_local.id IS NULL OR v_original.id IS NULL OR v_local.id = v_original.id
            OR v_local.jornada_id IS DISTINCT FROM p_jornada OR v_original.football_data_match_id IS NOT NULL
            OR v_original.status IS DISTINCT FROM 'scheduled' OR v_local.status IS DISTINCT FROM 'scheduled'
            OR v_original.kickoff <= v_agora OR v_local.kickoff <= v_agora
            OR v_original.home_score IS NOT NULL OR v_original.away_score IS NOT NULL
            OR v_local.home_score IS NOT NULL OR v_local.away_score IS NOT NULL
            OR EXISTS (SELECT 1 FROM public.predictions a JOIN public.predictions b ON b.user_id = a.user_id
              WHERE a.match_id = v_original.id AND b.match_id = v_local.id) THEN
            v_acao := 'importado_protegido';
          ELSE
            UPDATE public.predictions SET match_id = v_local.id WHERE match_id = v_original.id;
            UPDATE public.push_delivery_queue q SET status = 'cancelled',
              error_code = 'duplicate_match', updated_at = clock_timestamp()
            FROM public.notifications n
            WHERE n.id = q.notification_id AND n.match_id = v_original.id AND q.status = 'pending';

            UPDATE public.notifications SET match_id = v_local.id WHERE match_id = v_original.id;
            UPDATE public.matches SET is_bonus = COALESCE(v_local.is_bonus, false) OR COALESCE(v_original.is_bonus, false)
              WHERE id = v_local.id;
            DELETE FROM public.matches WHERE id = v_original.id;
            v_acao := 'importado_mantido';
          END IF;
        ELSIF v_original.id IS NULL OR v_original.status IS DISTINCT FROM 'scheduled'
          OR v_original.kickoff <= v_agora OR v_original.home_score IS NOT NULL OR v_original.away_score IS NOT NULL
          OR (v_original.football_data_match_id IS NOT NULL AND v_original.football_data_match_id <> v_jogo.id) THEN
          v_acao := 'rever';
        ELSIF v_local.id = v_original.id THEN
          v_acao := 'existente';
        ELSIF v_local.id IS NOT NULL AND (
          v_local.status IS DISTINCT FROM 'scheduled' OR v_local.kickoff <= v_agora
          OR v_local.home_score IS NOT NULL OR v_local.away_score IS NOT NULL
          OR v_local.is_bonus OR EXISTS (SELECT 1 FROM public.predictions p WHERE p.match_id = v_local.id)
        ) THEN
          v_acao := 'protegido';
        ELSE
          IF v_local.id IS NOT NULL THEN
            UPDATE public.push_delivery_queue q SET status = 'cancelled',
              error_code = 'duplicate_match', updated_at = clock_timestamp()
            FROM public.notifications n
            WHERE n.id = q.notification_id AND n.match_id = v_local.id AND q.status = 'pending';

            UPDATE public.notifications SET match_id = v_original.id WHERE match_id = v_local.id;
            DELETE FROM public.matches WHERE id = v_local.id;
          END IF;

          UPDATE public.matches SET football_data_match_id = v_jogo.id,
            football_data_competition = p_competicao, kickoff = v_jogo.hora WHERE id = v_original.id;
          v_acao := CASE WHEN v_local.id IS NULL THEN 'associado' ELSE 'corrigido' END;
        END IF;
      ELSIF v_local.id IS NOT NULL THEN
        IF v_local.status IS DISTINCT FROM 'scheduled' OR v_local.kickoff <= v_agora THEN
          v_acao := 'rever';
        ELSE
          v_acao := 'existente';
        END IF;
      ELSE
        SELECT array_agg(m.id) INTO v_candidatos FROM public.matches m
        WHERE m.season_id = p_epoca AND m.football_data_match_id IS NULL
          AND (m.jornada_id = p_jornada OR m.kickoff BETWEEN v_jogo.hora - interval '2 days' AND v_jogo.hora + interval '2 days')
          AND public.normalizar_equipa_calendario(m.home_team) = ANY(v_jogo.casas)
          AND public.normalizar_equipa_calendario(m.away_team) = ANY(v_jogo.foras);

        IF cardinality(v_candidatos) > 1 THEN
          v_acao := 'rever';
        ELSIF cardinality(v_candidatos) = 1 THEN
          SELECT * INTO STRICT v_local FROM public.matches WHERE id = v_candidatos[1];
          IF v_local.status IS DISTINCT FROM 'scheduled' OR v_local.kickoff <= v_agora
            OR v_local.kickoff NOT BETWEEN v_jogo.hora - interval '2 days' AND v_jogo.hora + interval '2 days' THEN
            v_acao := 'rever';
          ELSE
            UPDATE public.matches SET football_data_match_id = v_jogo.id,
              football_data_competition = p_competicao, kickoff = v_jogo.hora WHERE id = v_local.id;
            v_acao := 'associado';
          END IF;
        ELSIF v_jogo.novo IS NOT TRUE AND EXISTS (
          SELECT 1 FROM public.matches m WHERE m.season_id = p_epoca AND m.jornada_id = p_jornada
            AND m.football_data_match_id IS NULL
        ) THEN
          v_acao := 'rever';
        ELSE
          INSERT INTO public.matches (competition_id, season_id, jornada_id, home_team, away_team,
            kickoff, is_bonus, football_data_match_id, football_data_competition)
          VALUES (v_competicao, p_epoca, p_jornada, v_jogo.casa, v_jogo.fora, v_jogo.hora, false, v_jogo.id, p_competicao);
          v_acao := 'criado';
        END IF;
      END IF;
    END IF;
    v_detalhes := v_detalhes || jsonb_build_array(jsonb_build_object(
      'id', v_jogo.id, 'casa', v_jogo.casa, 'fora', v_jogo.fora, 'acao', v_acao
    ));
  END LOOP;

  RETURN jsonb_build_object('jogos', v_detalhes);
END;
$function$;

REVOKE ALL ON FUNCTION public.importar_jogos_selecionados(uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.importar_jogos_selecionados(uuid, uuid, text, jsonb) TO service_role;

COMMIT;
