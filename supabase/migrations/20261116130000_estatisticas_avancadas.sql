-- Predict League: nova função apenas de leitura. Não altera pontuação nem RLS.
BEGIN;
CREATE FUNCTION public.obter_estatisticas_avancadas(
  p_competition_id uuid,
  p_season_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_season public.seasons%ROWTYPE;
  v_epocas jsonb;
  v_resumo jsonb;
  v_jornadas jsonb;
  v_posicao bigint;
  v_lider bigint;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.competition_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.competition_id = p_competition_id
      AND cm.user_id = v_user AND p.approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Não tens acesso a esta competição.' USING ERRCODE = '42501';
  END IF;

  IF p_season_id IS NULL THEN
    SELECT * INTO STRICT v_season FROM public.seasons s
    WHERE s.competition_id = p_competition_id AND s.status = 'active';
  ELSE
    SELECT * INTO STRICT v_season FROM public.seasons s
    WHERE s.id = p_season_id AND s.competition_id = p_competition_id
      AND s.status IN ('active', 'completed');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id, 'nome', s.name, 'estado', s.status, 'teste', s.is_test
  ) ORDER BY s.created_at DESC, s.id), '[]'::jsonb)
  INTO v_epocas FROM public.seasons s
  WHERE s.competition_id = p_competition_id AND s.status IN ('active', 'completed');

  -- Reutiliza os pontos calculados pela vista existente.
  WITH base AS (
    SELECT m.id, m.is_bonus, m.status, m.home_score, m.away_score,
      ps.prediction_id, ps.points, ps.exact_score
    FROM public.matches m
    LEFT JOIN public.prediction_scores ps ON ps.match_id = m.id AND ps.user_id = v_user
    WHERE m.competition_id = p_competition_id AND m.season_id = v_season.id
  )
  SELECT jsonb_build_object(
    'totalJogos', COUNT(*),
    'jogosPontuados', COUNT(*) FILTER (WHERE points IS NOT NULL),
    'pontos', COALESCE(SUM(points), 0),
    'exatos', COUNT(*) FILTER (WHERE points IS NOT NULL AND exact_score IS TRUE),
    'soTendencia', COUNT(*) FILTER (WHERE points > 0 AND exact_score IS NOT TRUE),
    'errados', COUNT(*) FILTER (WHERE points = 0),
    'semPrognostico', COUNT(*) FILTER (WHERE status = 'finished'
      AND home_score IS NOT NULL AND away_score IS NOT NULL AND prediction_id IS NULL),
    'bonusPontuados', COUNT(*) FILTER (WHERE is_bonus AND points IS NOT NULL),
    'bonusPontos', COALESCE(SUM(points) FILTER (WHERE is_bonus), 0),
    'bonusExatos', COUNT(*) FILTER (WHERE is_bonus AND points IS NOT NULL AND exact_score IS TRUE),
    'bonusSoTendencia', COUNT(*) FILTER (WHERE is_bonus AND points > 0 AND exact_score IS NOT TRUE),
    'bonusErrados', COUNT(*) FILTER (WHERE is_bonus AND points = 0)
  ) INTO v_resumo FROM base;

  WITH totais AS (
    SELECT cm.user_id, COALESCE(NULLIF(p.display_name, ''), 'Jogador') AS jogador,
      COALESCE(SUM(ps.points), 0)::bigint AS pontos,
      COUNT(*) FILTER (WHERE ps.points IS NOT NULL AND ps.exact_score IS TRUE) AS exatos
    FROM public.competition_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    LEFT JOIN public.matches m ON m.competition_id = cm.competition_id AND m.season_id = v_season.id
    LEFT JOIN public.prediction_scores ps ON ps.match_id = m.id AND ps.user_id = cm.user_id
    WHERE cm.competition_id = p_competition_id AND p.approval_status = 'approved'
    GROUP BY cm.user_id, p.display_name
  ), posicoes AS (
    SELECT *, row_number() OVER (ORDER BY pontos DESC, exatos DESC, jogador ASC) AS posicao,
      COUNT(*) OVER (PARTITION BY pontos, exatos, jogador) AS indistinguiveis,
      MAX(pontos) OVER () AS lider
    FROM totais
  )
  -- Nomes e critérios totalmente iguais não permitem identificar uma posição única.
  SELECT CASE WHEN indistinguiveis = 1 THEN posicao ELSE NULL END, lider
  INTO v_posicao, v_lider FROM posicoes WHERE user_id = v_user;

  WITH por_jornada AS (
    SELECT j.id, j.numero, j.nome,
      COUNT(m.id) AS jogos,
      COUNT(ps.prediction_id) FILTER (WHERE ps.points IS NOT NULL) AS pontuados,
      COALESCE(SUM(ps.points), 0) AS pontos,
      COUNT(m.id) > 0 AND COALESCE(bool_and(m.status = 'finished'
        AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL), false) AS concluida
    FROM public.jornadas j
    LEFT JOIN public.matches m ON m.jornada_id = j.id
      AND m.competition_id = p_competition_id AND m.season_id = v_season.id
    LEFT JOIN public.prediction_scores ps ON ps.match_id = m.id AND ps.user_id = v_user
    WHERE j.competition_id = p_competition_id AND j.season_id = v_season.id
    GROUP BY j.id, j.numero, j.nome
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'numero', numero, 'nome', nome, 'jogos', jogos,
    'pontuados', pontuados, 'pontos', pontos, 'concluida', concluida
  ) ORDER BY numero NULLS LAST, id), '[]'::jsonb)
  INTO v_jornadas FROM por_jornada;

  RETURN jsonb_build_object(
    'versao', 1, 'competicaoId', p_competition_id, 'utilizadorId', v_user,
    'epoca', jsonb_build_object('id', v_season.id, 'nome', v_season.name,
      'estado', v_season.status, 'teste', v_season.is_test),
    'epocas', v_epocas, 'resumo', v_resumo,
    'posicao', v_posicao, 'pontosLider', v_lider, 'jornadas', v_jornadas
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.obter_estatisticas_avancadas(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.obter_estatisticas_avancadas(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.obter_estatisticas_avancadas(uuid, uuid) TO authenticated;
COMMENT ON FUNCTION public.obter_estatisticas_avancadas(uuid, uuid) IS
'Estatísticas próprias por época. Apenas membros aprovados. Reutiliza prediction_scores; não altera dados.';
COMMIT;
