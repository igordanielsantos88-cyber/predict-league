-- Predict League: conquistas pessoais calculadas, sem escrita de dados.
-- Não substitui funções, tabelas ou políticas existentes.
BEGIN;
CREATE FUNCTION public.obter_conquistas(
  p_competition_id uuid,
  p_season_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_season public.seasons%ROWTYPE;
  v_epocas jsonb;
  v_exatos bigint := 0;
  v_jogos bigint := 0;
  v_campeoes jsonb := '[]'::jsonb;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.competition_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.competition_id = p_competition_id AND cm.user_id = v_user
      AND p.approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Não tens acesso a esta competição.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.name,
    'estado', s.status) ORDER BY (s.status = 'active') DESC, s.created_at DESC, s.id), '[]'::jsonb)
  INTO v_epocas FROM public.seasons s
  WHERE s.competition_id = p_competition_id AND s.is_test IS FALSE
    AND s.status IN ('active', 'completed');

  IF p_season_id IS NULL THEN
    SELECT s.* INTO v_season FROM public.seasons s
    WHERE s.id = (v_epocas -> 0 ->> 'id')::uuid;
  ELSE
    SELECT s.* INTO v_season FROM public.seasons s
    WHERE s.id = p_season_id AND s.competition_id = p_competition_id
      AND s.is_test IS FALSE AND s.status IN ('active', 'completed');
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Esta época oficial não está disponível.' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_season.id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_jogos FROM public.matches m
    WHERE m.competition_id = p_competition_id AND m.season_id = v_season.id;

    -- Cada prognóstico exato conta uma vez, mesmo num jogo bónus.
    SELECT COUNT(*) INTO v_exatos
    FROM public.prediction_scores ps JOIN public.matches m ON m.id = ps.match_id
    WHERE ps.user_id = v_user AND m.competition_id = p_competition_id
      AND m.season_id = v_season.id AND m.status = 'finished'
      AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL
      AND ps.points IS NOT NULL AND ps.exact_score IS TRUE;

    -- Não usa a função da jornada existente, pois esta só admite a época ativa.
    -- Participantes e desempates seguem a classificação atual; o nome não desempata medalhas.
    WITH concluidas AS (
      SELECT j.id, j.numero, j.nome
      FROM public.jornadas j JOIN public.matches m ON m.jornada_id = j.id
        AND m.competition_id = p_competition_id AND m.season_id = v_season.id
      WHERE j.competition_id = p_competition_id AND j.season_id = v_season.id
      GROUP BY j.id, j.numero, j.nome
      HAVING bool_and(COALESCE(m.status = 'finished'
        AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL, false))
    ), membros AS (
      SELECT p.id FROM public.profiles p WHERE p.approval_status = 'approved'
      AND EXISTS (SELECT 1 FROM public.competition_members cm
        WHERE cm.user_id = p.id AND cm.competition_id = p_competition_id)
    ), totais AS (
      SELECT j.id, j.numero, j.nome, p.id AS user_id,
        COALESCE(SUM(ps.points), 0) AS pontos,
        COUNT(ps.prediction_id) FILTER (WHERE ps.points IS NOT NULL AND ps.exact_score IS TRUE) AS exatos
      FROM concluidas j CROSS JOIN membros p
      JOIN public.matches m ON m.jornada_id = j.id
        AND m.competition_id = p_competition_id AND m.season_id = v_season.id
      LEFT JOIN public.prediction_scores ps ON ps.match_id = m.id AND ps.user_id = p.id
      GROUP BY j.id, j.numero, j.nome, p.id
    ), posicoes AS (
      SELECT *, rank() OVER (PARTITION BY id ORDER BY pontos DESC, exatos DESC) AS posicao
      FROM totais
    ), primeiros AS (
      SELECT *, COUNT(*) OVER (PARTITION BY id) AS vencedores FROM posicoes WHERE posicao = 1
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'numero', numero,
      'nome', nome, 'pontos', pontos, 'exatos', exatos, 'partilhada', vencedores > 1)
      ORDER BY numero NULLS LAST, id), '[]'::jsonb)
    INTO v_campeoes FROM primeiros WHERE user_id = v_user;
  END IF;

  RETURN jsonb_build_object('versao', 1, 'competicaoId', p_competition_id,
    'utilizadorId', v_user, 'epocas', v_epocas,
    'epoca', CASE WHEN v_season.id IS NULL THEN NULL ELSE
      jsonb_build_object('id', v_season.id, 'nome', v_season.name, 'estado', v_season.status) END,
    'jogosRegistados', v_jogos, 'exatos', v_exatos,
    'primeiroPleno', v_exatos >= 1, 'especialista', v_exatos >= 10,
    'objetivoEspecialista', 10, 'jornadasCampeao', v_campeoes);
END;
$function$;
REVOKE ALL ON FUNCTION public.obter_conquistas(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.obter_conquistas(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.obter_conquistas(uuid, uuid) TO authenticated;
COMMENT ON FUNCTION public.obter_conquistas(uuid, uuid) IS
'Conquistas pessoais por época oficial, recalculadas na leitura. Membro aprovado; épocas de teste excluídas; empate por pontos e exatos partilha medalha.';
COMMIT;
