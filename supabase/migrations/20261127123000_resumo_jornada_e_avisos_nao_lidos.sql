BEGIN;

CREATE FUNCTION public.contar_notificacoes_nao_lidas()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT count(*)
  FROM public.notifications n
  JOIN public.profiles p ON p.id = n.user_id AND p.approval_status = 'approved'
  WHERE n.user_id = (SELECT auth.uid()) AND n.is_read IS FALSE;
$function$;

CREATE FUNCTION public.obter_resumo_jornada(p_competition_id uuid, p_jornada_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_epoca uuid;
  v_numero integer;
  v_jogos jsonb;
  v_total bigint;
  v_terminados bigint;
  v_pontos bigint;
  v_posicao_anterior bigint;
  v_posicao_atual bigint;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.competition_members cm
    JOIN public.profiles p ON p.id = cm.user_id AND p.approval_status = 'approved'
    WHERE cm.competition_id = p_competition_id AND cm.user_id = v_user
  ) THEN
    RAISE EXCEPTION 'Não tens acesso a esta competição.' USING ERRCODE = '42501';
  END IF;

  SELECT j.season_id, j.numero INTO STRICT v_epoca, v_numero
  FROM public.jornadas j
  JOIN public.seasons s ON s.id = j.season_id AND s.competition_id = j.competition_id AND s.status = 'active'
  WHERE j.id = p_jornada_id AND j.competition_id = p_competition_id;

  WITH jogos AS (
    SELECT m.id, m.home_team, m.away_team, m.home_score, m.away_score, m.kickoff,
      ps.points, ps.exact_score, ps.prediction_id,
      (m.status = 'finished' AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL) AS terminado
    FROM public.matches m
    LEFT JOIN public.prediction_scores ps ON ps.match_id = m.id AND ps.user_id = v_user
    WHERE m.jornada_id = p_jornada_id AND m.season_id = v_epoca AND m.competition_id = p_competition_id
  )
  SELECT count(*), count(*) FILTER (WHERE terminado), COALESCE(sum(points) FILTER (WHERE terminado), 0),
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'casa', home_team, 'fora', away_team,
      'golosCasa', home_score, 'golosFora', away_score, 'pontos', points,
      'acerto', CASE
        WHEN prediction_id IS NULL THEN 'sem-prognostico'
        WHEN points IS NULL THEN 'por-pontuar'
        WHEN exact_score IS TRUE THEN 'exato'
        WHEN points > 0 THEN 'tendencia'
        ELSE 'falhado'
      END
    ) ORDER BY kickoff, id) FILTER (WHERE terminado), '[]'::jsonb)
  INTO v_total, v_terminados, v_pontos, v_jogos
  FROM jogos;

  -- Tal como na Liga, só compara após duas jornadas consecutivas concluídas.
  IF v_numero > 1 AND v_terminados > 0 AND v_terminados = v_total AND (
    SELECT count(*) = v_numero AND count(DISTINCT j.numero) = v_numero AND bool_and(
      EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.jornada_id = j.id AND m.season_id = v_epoca AND m.competition_id = p_competition_id
      ) AND NOT EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.jornada_id = j.id AND m.season_id = v_epoca AND m.competition_id = p_competition_id
          AND (m.status IS DISTINCT FROM 'finished' OR m.home_score IS NULL OR m.away_score IS NULL)
      )
    )
    FROM public.jornadas j
    WHERE j.season_id = v_epoca AND j.competition_id = p_competition_id AND j.numero BETWEEN 1 AND v_numero
  ) THEN
    WITH posicoes AS (
      SELECT limite.numero, c.user_id,
        row_number() OVER (PARTITION BY limite.numero
          ORDER BY c.pontos DESC, c.resultados_exatos DESC, c.jogador ASC) AS posicao,
        count(*) OVER (PARTITION BY limite.numero, c.pontos, c.resultados_exatos, c.jogador) AS empatados
      FROM (VALUES (v_numero - 1), (v_numero)) AS limite(numero)
      CROSS JOIN LATERAL public.obter_classificacao_ate_jornada(p_competition_id, limite.numero) c
    )
    SELECT max(posicao) FILTER (WHERE numero = v_numero - 1),
      max(posicao) FILTER (WHERE numero = v_numero)
    INTO v_posicao_anterior, v_posicao_atual
    FROM posicoes
    WHERE user_id = v_user AND empatados = 1;
  END IF;

  RETURN jsonb_build_object(
    'jornadaId', p_jornada_id, 'pontos', v_pontos, 'total', v_total, 'terminados', v_terminados,
    'jogos', v_jogos, 'posicaoAnterior', v_posicao_anterior, 'posicaoAtual', v_posicao_atual
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.contar_notificacoes_nao_lidas() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.obter_resumo_jornada(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contar_notificacoes_nao_lidas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_resumo_jornada(uuid, uuid) TO authenticated;

COMMIT;
