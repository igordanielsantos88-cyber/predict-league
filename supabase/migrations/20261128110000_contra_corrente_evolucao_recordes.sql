BEGIN;

CREATE FUNCTION public.obter_destaques_epoca(p_competition_id uuid, p_season_id uuid)
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
    WITH participantes AS (
      SELECT DISTINCT p.id, coalesce(nullif(p.display_name, ''), 'Jogador') AS nome
      FROM public.competition_members cm
      JOIN public.profiles p ON p.id = cm.user_id AND p.approval_status = 'approved'
      WHERE cm.competition_id = p_competition_id
    ),
    jogos AS (
      SELECT m.id, m.jornada_id, m.kickoff, m.home_team, m.away_team, m.home_score, m.away_score,
        (m.status IS NOT DISTINCT FROM 'finished' AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL) AS terminado
      FROM public.matches m WHERE m.competition_id = p_competition_id AND m.season_id = p_season_id
    ),
    pontos AS (
      SELECT j.id AS jogo_id, j.jornada_id, ps.user_id, ps.points, ps.exact_score
      FROM jogos j
      JOIN public.prediction_scores ps ON ps.match_id = j.id AND ps.points IS NOT NULL
      JOIN participantes p ON p.id = ps.user_id
      WHERE j.terminado
    ),
    minhas_escolhas AS (
      SELECT j.*, pt.points, sign(pr.home_goals - pr.away_goals) AS escolha
      FROM jogos j JOIN pontos pt ON pt.jogo_id = j.id AND pt.user_id = v_user
      JOIN public.predictions pr ON pr.match_id = j.id AND pr.user_id = v_user
      WHERE j.kickoff <= now() AND pr.home_goals >= 0 AND pr.away_goals >= 0
    ),
    votos AS (
      SELECT m.id, sign(pr.home_goals - pr.away_goals) AS escolha, count(*) AS votos
      FROM minhas_escolhas m
      JOIN public.predictions pr ON pr.match_id = m.id AND pr.user_id <> v_user
      JOIN participantes p ON p.id = pr.user_id
      WHERE pr.home_goals >= 0 AND pr.away_goals >= 0
      GROUP BY m.id, sign(pr.home_goals - pr.away_goals)
    ),
    maiorias AS (
      SELECT v.*, sum(v.votos) OVER (PARTITION BY v.id) AS total
      FROM votos v
    ),
    contra_corrente AS (
      SELECT m.*, v.escolha AS maioria, v.votos, v.total
      FROM minhas_escolhas m JOIN maiorias v ON v.id = m.id AND v.votos * 2 > v.total
      WHERE m.escolha <> v.escolha
    ),
    jornadas AS (
      SELECT j.id, j.numero, j.nome, coalesce(bool_and(m.terminado), false) AS concluida
      FROM public.jornadas j LEFT JOIN jogos m ON m.jornada_id = j.id
      WHERE j.competition_id = p_competition_id AND j.season_id = p_season_id
      GROUP BY j.id, j.numero, j.nome
    ),
    jornadas_numeradas AS (
      SELECT j.*, row_number() OVER (ORDER BY numero NULLS LAST, id) AS linha,
        count(*) OVER (PARTITION BY numero) AS repeticoes
      FROM jornadas j
    ),
    jornadas_acumuladas AS (
      SELECT j.*, bool_and(concluida AND coalesce(numero = linha, false) AND repeticoes = 1)
        OVER (ORDER BY linha) AS disponivel
      FROM jornadas_numeradas j
    ),
    pontos_jornada AS (
      SELECT p.jornada_id, p.user_id, sum(p.points) AS pontos,
        count(*) FILTER (WHERE p.exact_score IS TRUE) AS exatos
      FROM pontos p GROUP BY p.jornada_id, p.user_id
    ),
    acumulados AS (
      SELECT j.id, j.numero, j.nome AS jornada, p.id AS user_id, p.nome,
        coalesce(pj.pontos, 0) AS pontos,
        sum(coalesce(pj.pontos, 0)) OVER por_pessoa AS total,
        sum(coalesce(pj.exatos, 0)) OVER por_pessoa AS exatos
      FROM jornadas_acumuladas j CROSS JOIN participantes p
      LEFT JOIN pontos_jornada pj ON pj.jornada_id = j.id AND pj.user_id = p.id
      WHERE j.disponivel
      WINDOW por_pessoa AS (PARTITION BY p.id ORDER BY j.numero)
    ),
    classificacao AS (
      SELECT a.*, rank() OVER (PARTITION BY id ORDER BY total DESC, exatos DESC, nome ASC) AS posicao
      FROM acumulados a
    ),
    evolucao AS (
      SELECT c.*, lag(posicao) OVER (PARTITION BY user_id ORDER BY numero) AS anterior
      FROM classificacao c
    ),
    minhas_posicoes AS (
      SELECT e.*, ARRAY(
        SELECT rival.nome FROM evolucao rival
        WHERE rival.id = e.id AND rival.anterior < e.anterior AND rival.posicao > e.posicao
        ORDER BY rival.anterior, rival.nome, rival.user_id
      ) AS ultrapassados
      FROM evolucao e WHERE e.user_id = v_user
    ),
    quebras AS (
      SELECT p.id, p.nome, j.id AS jogo_id, j.kickoff, coalesce(pt.points, 0) > 0 AS pontuou
      FROM participantes p CROSS JOIN jogos j
      LEFT JOIN pontos pt ON pt.user_id = p.id AND pt.jogo_id = j.id
      WHERE j.terminado
    ),
    series AS (
      SELECT q.*, count(*) FILTER (WHERE NOT pontuou)
        OVER (PARTITION BY id ORDER BY kickoff, jogo_id) AS serie
      FROM quebras q
    ),
    recordes AS (
      SELECT 'subida' AS tipo, e.nome, e.numero, e.jornada, e.anterior - e.posicao AS valor
      FROM evolucao e WHERE e.anterior > e.posicao
      UNION ALL
      SELECT 'sequencia', s.nome, NULL, NULL, max(s.jogos)
      FROM (
        SELECT id, nome, serie, count(*) AS jogos
        FROM series WHERE pontuou GROUP BY id, nome, serie
      ) s GROUP BY s.id, s.nome
      UNION ALL
      SELECT 'exatos', p.nome, j.numero, j.nome, pj.exatos FROM pontos_jornada pj
      JOIN participantes p ON p.id = pj.user_id
      JOIN jornadas j ON j.id = pj.jornada_id
      WHERE j.concluida AND pj.exatos > 0
    ),
    recordes_ordenados AS (
      SELECT r.*, max(valor) OVER (PARTITION BY tipo) AS maximo FROM recordes r
    )
    SELECT jsonb_build_object(
      'contraCorrente', (
        SELECT jsonb_build_object('total', count(*), 'pontos', coalesce(sum(points), 0),
          'acertos', count(*) FILTER (WHERE points > 0), 'jogos', coalesce(jsonb_agg(jsonb_build_object(
            'id', id, 'casa', home_team, 'fora', away_team, 'golosCasa', home_score, 'golosFora', away_score,
            'escolha', escolha, 'maioria', maioria, 'votos', votos, 'total', total, 'pontos', points
          ) ORDER BY points DESC, kickoff DESC, id), '[]'::jsonb))
        FROM contra_corrente
      ),
      'evolucao', (
        SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'numero', numero, 'jornada', jornada,
          'posicao', posicao, 'anterior', anterior, 'pontos', pontos, 'total', total, 'ultrapassados', ultrapassados
        ) ORDER BY numero), '[]'::jsonb) FROM minhas_posicoes
      ),
      'recordes', (
        SELECT coalesce(jsonb_agg(jsonb_build_object('tipo', tipo, 'nome', nome,
          'numero', numero, 'jornada', jornada, 'valor', valor
        ) ORDER BY tipo, numero NULLS LAST, nome) FILTER (WHERE valor = maximo), '[]'::jsonb)
        FROM recordes_ordenados
      )
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.obter_destaques_epoca(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obter_destaques_epoca(uuid, uuid) TO authenticated;

COMMIT;
