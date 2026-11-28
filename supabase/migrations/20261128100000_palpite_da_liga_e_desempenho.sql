BEGIN;

CREATE FUNCTION public.obter_palpite_da_liga(p_match_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_competicao uuid;
  v_kickoff timestamptz;
BEGIN
  SELECT m.competition_id, m.kickoff INTO v_competicao, v_kickoff
  FROM public.matches m JOIN public.seasons s
    ON s.id = m.season_id AND s.competition_id = m.competition_id AND s.status IN ('active', 'completed')
  WHERE m.id = p_match_id
    AND EXISTS (
      SELECT 1 FROM public.competition_members cm
      JOIN public.profiles p ON p.id = cm.user_id AND p.approval_status = 'approved'
      WHERE cm.competition_id = m.competition_id AND cm.user_id = (SELECT auth.uid())
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não tens acesso a este jogo.' USING ERRCODE = '42501';
  END IF;
  IF v_kickoff IS NULL OR v_kickoff > now() THEN RETURN NULL; END IF;

  RETURN (
    WITH marcadores AS (
      SELECT pr.home_goals AS casa, pr.away_goals AS fora, count(*) AS votos
      FROM public.predictions pr
      WHERE pr.match_id = p_match_id AND pr.home_goals >= 0 AND pr.away_goals >= 0
        AND EXISTS (
          SELECT 1 FROM public.competition_members cm
          JOIN public.profiles p ON p.id = cm.user_id AND p.approval_status = 'approved'
          WHERE cm.competition_id = v_competicao AND cm.user_id = pr.user_id
        )
      GROUP BY pr.home_goals, pr.away_goals
    )
    SELECT jsonb_build_object(
      'total', coalesce(sum(votos), 0),
      'casa', coalesce(sum(votos) FILTER (WHERE casa > fora), 0),
      'empate', coalesce(sum(votos) FILTER (WHERE casa = fora), 0),
      'fora', coalesce(sum(votos) FILTER (WHERE casa < fora), 0),
      'populares', (
        SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.casa, m.fora), '[]'::jsonb)
        FROM marcadores m WHERE m.votos = (SELECT max(votos) FROM marcadores)
      )
    )
    FROM marcadores
  );
END;
$function$;

CREATE FUNCTION public.obter_desempenho_prognosticos(p_competition_id uuid, p_season_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.competition_members cm
    JOIN public.profiles p ON p.id = cm.user_id AND p.approval_status = 'approved'
    JOIN public.seasons s ON s.competition_id = cm.competition_id AND s.status IN ('active', 'completed')
    WHERE cm.competition_id = p_competition_id AND cm.user_id = v_user AND s.id = p_season_id
  ) THEN
    RAISE EXCEPTION 'Não tens acesso a esta época.' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH pontuados AS (
      SELECT m.id, m.home_team, m.away_team, m.home_crest_competition, m.away_crest_competition,
        m.football_data_competition, ps.points, ps.exact_score
      FROM public.matches m
      JOIN public.prediction_scores ps ON ps.match_id = m.id AND ps.user_id = v_user AND ps.points IS NOT NULL
      WHERE m.competition_id = p_competition_id AND m.season_id = p_season_id
        AND m.status = 'finished' AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL
    ),
    equipas AS (
      SELECT j.id, j.points, j.exact_score, lado.nome,
        coalesce(a.official_name, n.normalizado, lado.nome) AS chave,
        a.alias IS NOT NULL AS e_alias
      FROM pontuados j
      CROSS JOIN LATERAL (VALUES (j.home_team, j.home_crest_competition),
        (j.away_team, j.away_crest_competition)) lado(nome, competicao)
      CROSS JOIN LATERAL (SELECT nullif(public.normalizar_equipa_calendario(lado.nome), '') AS normalizado) n
      LEFT JOIN public.calendar_team_aliases a ON a.alias = n.normalizado AND NOT a.ambiguous
        AND a.competition_code = coalesce(j.football_data_competition, lado.competicao)
    ),
    equipas_por_jogo AS (
      SELECT DISTINCT ON (id, chave) id, chave, nome, points, exact_score, e_alias
      FROM equipas ORDER BY id, chave, e_alias, nome
    ),
    grupos AS (
      SELECT 'equipa' AS tipo, chave,
        coalesce(min(nome) FILTER (WHERE NOT e_alias), min(nome)) AS nome,
        count(*) AS jogos, count(*) FILTER (WHERE points > 0 OR exact_score IS TRUE) AS acertos,
        count(*) FILTER (WHERE exact_score IS TRUE) AS exatos, sum(points) AS pontos
      FROM equipas_por_jogo GROUP BY chave
      UNION ALL
      SELECT 'competicao', coalesce(football_data_competition, ''), NULL,
        count(*), count(*) FILTER (WHERE points > 0 OR exact_score IS TRUE),
        count(*) FILTER (WHERE exact_score IS TRUE), sum(points)
      FROM pontuados GROUP BY football_data_competition
    )
    SELECT jsonb_build_object(
      'equipas', coalesce(jsonb_agg(to_jsonb(g) - 'tipo' ORDER BY pontos DESC, jogos DESC, chave)
        FILTER (WHERE tipo = 'equipa'), '[]'::jsonb),
      'competicoes', coalesce(jsonb_agg(to_jsonb(g) - 'tipo' ORDER BY pontos DESC, jogos DESC, chave)
        FILTER (WHERE tipo = 'competicao'), '[]'::jsonb)
    ) FROM grupos g
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.obter_palpite_da_liga(uuid), public.obter_desempenho_prognosticos(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obter_palpite_da_liga(uuid), public.obter_desempenho_prognosticos(uuid, uuid)
  TO authenticated;

COMMIT;
