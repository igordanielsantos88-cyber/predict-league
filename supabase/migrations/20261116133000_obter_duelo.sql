-- Predict League: comparação estatística, sem escrita de dados ou alteração de RLS.
BEGIN;
CREATE FUNCTION public.obter_duelo(
  p_competition_id uuid,
  p_opponent_id uuid DEFAULT NULL,
  p_season_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_season public.seasons%ROWTYPE;
  v_opponent uuid := p_opponent_id;
  v_participantes jsonb;
  v_epocas jsonb;
  v_jogadores jsonb;
  v_jornadas jsonb;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.competition_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.competition_id = p_competition_id AND cm.user_id = v_user
      AND p.approval_status = 'approved'
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

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', p.id,
    'nome', COALESCE(NULLIF(p.display_name, ''), 'Jogador'))
    ORDER BY COALESCE(NULLIF(p.display_name, ''), 'Jogador'), p.id), '[]'::jsonb)
  INTO v_participantes
  FROM public.profiles p
  WHERE p.id <> v_user AND p.approval_status = 'approved'
    AND EXISTS (SELECT 1 FROM public.competition_members cm
      WHERE cm.competition_id = p_competition_id AND cm.user_id = p.id);

  -- A primeira abertura seleciona o primeiro participante disponível.
  IF v_opponent IS NULL AND jsonb_array_length(v_participantes) > 0 THEN
    v_opponent := (v_participantes -> 0 ->> 'id')::uuid;
  END IF;
  IF v_opponent IS NOT NULL AND (v_opponent = v_user OR NOT EXISTS (
    SELECT 1 FROM public.competition_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.competition_id = p_competition_id AND cm.user_id = v_opponent
      AND p.approval_status = 'approved'
  )) THEN
    RAISE EXCEPTION 'O participante escolhido não está disponível nesta competição.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.name,
    'teste', s.is_test, 'estado', s.status) ORDER BY s.created_at DESC, s.id), '[]'::jsonb)
  INTO v_epocas FROM public.seasons s
  WHERE s.competition_id = p_competition_id AND s.status IN ('active', 'completed');

  -- Sem golos previstos nem detalhes de prognósticos na resposta.
  -- Usa a vista de pontuação, filtrando explicitamente jogos terminados válidos.
  WITH totais AS (
    SELECT p.id, COALESCE(NULLIF(p.display_name, ''), 'Jogador') AS nome,
      COUNT(ps.prediction_id) FILTER (WHERE ps.points IS NOT NULL) AS pontuados,
      COALESCE(SUM(ps.points), 0) AS pontos,
      COUNT(ps.prediction_id) FILTER (WHERE ps.points IS NOT NULL AND ps.exact_score IS TRUE) AS exatos,
      COUNT(ps.prediction_id) FILTER (WHERE ps.points > 0 AND ps.exact_score IS NOT TRUE) AS tendencia,
      COUNT(ps.prediction_id) FILTER (WHERE ps.points = 0) AS errados,
      COUNT(m.id) FILTER (WHERE ps.prediction_id IS NULL) AS ausencias
    FROM public.profiles p
    LEFT JOIN public.matches m ON m.competition_id = p_competition_id
      AND m.season_id = v_season.id AND m.status = 'finished'
      AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL
    LEFT JOIN public.prediction_scores ps ON ps.match_id = m.id AND ps.user_id = p.id
    WHERE p.id = v_user OR p.id = v_opponent
    GROUP BY p.id, p.display_name
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'nome', nome,
    'pontuados', pontuados, 'pontos', pontos, 'exatos', exatos,
    'soTendencia', tendencia, 'errados', errados, 'semPrognostico', ausencias)
    ORDER BY (id = v_user) DESC, id), '[]'::jsonb)
  INTO v_jogadores FROM totais;

  WITH rondas AS (
    SELECT j.id, j.numero, j.nome, COUNT(m.id) AS jogos,
      COUNT(m.id) FILTER (WHERE m.status = 'finished' AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL) AS terminados,
      COALESCE(SUM(meu.points) FILTER (WHERE m.status = 'finished' AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL), 0) AS meus_pontos,
      COALESCE(SUM(outro.points) FILTER (WHERE m.status = 'finished' AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL), 0) AS outros_pontos
    FROM public.jornadas j
    LEFT JOIN public.matches m ON m.jornada_id = j.id
      AND m.competition_id = p_competition_id AND m.season_id = v_season.id
    LEFT JOIN public.prediction_scores meu ON meu.match_id = m.id AND meu.user_id = v_user
    LEFT JOIN public.prediction_scores outro ON outro.match_id = m.id AND outro.user_id = v_opponent
    WHERE j.competition_id = p_competition_id AND j.season_id = v_season.id
    GROUP BY j.id, j.numero, j.nome
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'numero', numero, 'nome', nome,
    'jogos', jogos, 'terminados', terminados, 'concluida', jogos > 0 AND jogos = terminados,
    'meusPontos', meus_pontos, 'outrosPontos', outros_pontos) ORDER BY numero NULLS LAST, id), '[]'::jsonb)
  INTO v_jornadas FROM rondas;

  RETURN jsonb_build_object('versao', 1, 'competicaoId', p_competition_id,
    'utilizadorId', v_user, 'adversarioId', v_opponent,
    'epoca', jsonb_build_object('id', v_season.id, 'nome', v_season.name, 'teste', v_season.is_test),
    'epocas', v_epocas, 'participantes', v_participantes, 'jogadores', v_jogadores, 'jornadas', v_jornadas);
END;
$function$;
REVOKE ALL ON FUNCTION public.obter_duelo(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.obter_duelo(uuid, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.obter_duelo(uuid, uuid, uuid) TO authenticated;
COMMENT ON FUNCTION public.obter_duelo(uuid, uuid, uuid) IS
'Comparação estatística entre o utilizador ligado e outro membro aprovado. Apenas pontos de jogos terminados, sem escrita.';
COMMIT;
