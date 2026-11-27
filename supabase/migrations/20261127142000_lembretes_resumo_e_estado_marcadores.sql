BEGIN;

-- O gerador agendado existente continua a criar os avisos. O filtro atua antes da caixa de entrada e da fila push.
CREATE OR REPLACE FUNCTION public.associar_jogo_lembrete_notificacao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NEW.type ~ '^reminder_(24h|1h)_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    NEW.match_id := right(NEW.type, 36)::uuid;
  ELSIF NEW.type IS DISTINCT FROM 'match_reminder' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.matches m
    JOIN public.seasons s ON s.id = m.season_id AND s.status = 'active'
    JOIN public.competition_members cm ON cm.competition_id = m.competition_id AND cm.user_id = NEW.user_id
    JOIN public.profiles p ON p.id = cm.user_id AND p.approval_status = 'approved'
    WHERE m.id = NEW.match_id AND m.status = 'scheduled' AND m.kickoff > now()
      AND NOT EXISTS (
        SELECT 1 FROM public.predictions pr WHERE pr.match_id = m.id AND pr.user_id = NEW.user_id
      )
  ) THEN RETURN NULL; END IF;
  RETURN NEW;
END;
$function$;

CREATE FUNCTION public.obter_ultima_jornada_concluida(p_competition_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_jornada record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.competition_members cm
    JOIN public.profiles p ON p.id = cm.user_id AND p.approval_status = 'approved'
    WHERE cm.competition_id = p_competition_id AND cm.user_id = (SELECT auth.uid())
  ) THEN RAISE EXCEPTION 'Não tens acesso a esta competição.' USING ERRCODE = '42501'; END IF;

  SELECT j.id, j.nome, j.numero INTO v_jornada
  FROM public.jornadas j
  JOIN public.seasons s ON s.id = j.season_id AND s.competition_id = j.competition_id AND s.status = 'active'
  JOIN public.matches m ON m.jornada_id = j.id AND m.season_id = s.id AND m.competition_id = j.competition_id
  WHERE j.competition_id = p_competition_id
  GROUP BY j.id, j.nome, j.numero
  HAVING bool_and(m.status IS NOT DISTINCT FROM 'finished' AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL)
  ORDER BY j.numero DESC, j.id
  LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN public.obter_resumo_jornada(p_competition_id, v_jornada.id)
    || jsonb_build_object('nome', v_jornada.nome, 'numero', v_jornada.numero);
END;
$function$;

CREATE FUNCTION public.obter_estado_recolha_marcadores(p_epoca uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NOT public.pode_gerir_calendario() THEN
    RAISE EXCEPTION 'Marcadores reservados a administradores.' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH jogos AS (
      SELECT m.id, m.kickoff, m.home_team, m.away_team, m.jornada_id, m.status,
        m.home_score, m.away_score, r.checked_at, r.home_score AS marcador_recebido
      FROM public.matches m
      JOIN public.seasons s ON s.id = m.season_id AND s.status = 'active'
      LEFT JOIN public.calendar_result_reviews r
        ON r.match_id = m.id AND r.source_match_id = m.football_data_match_id
      WHERE s.id = p_epoca AND m.football_data_match_id IS NOT NULL AND m.jornada_id IS NOT NULL
    )
    SELECT jsonb_build_object(
      'ultimaConsulta', max(checked_at),
      'porRever', (SELECT coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM public.obter_marcadores_por_rever(p_epoca) r),
      'emEspera', coalesce(jsonb_agg(jsonb_build_object(
        'jogoId', id, 'jornadaId', jornada_id, 'casa', home_team, 'fora', away_team, 'consultadoEm', checked_at
      ) ORDER BY kickoff DESC, id) FILTER (
        WHERE kickoff <= now() - interval '90 minutes' AND marcador_recebido IS NULL
          AND (status = 'scheduled' OR (status = 'finished' AND (home_score IS NULL OR away_score IS NULL)))
      ), '[]'::jsonb)
    ) FROM jogos
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.obter_ultima_jornada_concluida(uuid), public.obter_estado_recolha_marcadores(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obter_ultima_jornada_concluida(uuid), public.obter_estado_recolha_marcadores(uuid)
  TO authenticated;

COMMIT;
