BEGIN;

ALTER TABLE public.notifications
  ADD COLUMN read_batch_id uuid,
  ADD COLUMN read_batch_expires_at timestamptz;

CREATE INDEX notifications_read_batch_idx ON public.notifications(user_id, read_batch_id)
  WHERE read_batch_id IS NOT NULL;

CREATE FUNCTION public.marcar_todas_notificacoes_lidas()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_lote uuid := gen_random_uuid();
  v_expira timestamptz := clock_timestamp() + interval '1 minute';
  v_total bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_user AND p.approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Conta indisponível.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.notifications
  SET is_read = true, read_batch_id = v_lote, read_batch_expires_at = v_expira
  WHERE user_id = v_user AND is_read IS FALSE;
  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN jsonb_build_object('total', v_total, 'lote', v_lote, 'expiraEm', v_expira);
END;
$function$;

CREATE FUNCTION public.desfazer_notificacoes_lidas(p_lote uuid)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_total bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_user AND p.approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Conta indisponível.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.notifications
  SET is_read = false, read_batch_id = NULL, read_batch_expires_at = NULL
  WHERE user_id = v_user AND read_batch_id = p_lote
    AND is_read IS TRUE AND read_batch_expires_at > clock_timestamp();
  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END;
$function$;

CREATE FUNCTION public.prever_impacto_resultado(p_jogo uuid, p_casa integer, p_fora integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_jogo public.matches%ROWTYPE;
  v_prognosticos bigint;
  v_exatos bigint;
  v_tendencias bigint;
  v_exato numeric;
  v_tendencia numeric;
  v_regras_consistentes boolean;
  v_movimentos jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin' AND p.approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Pré-visualização reservada a administradores.' USING ERRCODE = '42501';
  END IF;

  SELECT m.* INTO STRICT v_jogo FROM public.matches m
  JOIN public.seasons s ON s.id = m.season_id AND s.competition_id = m.competition_id AND s.status = 'active'
  WHERE m.id = p_jogo AND m.kickoff <= now();
  IF p_casa IS NULL OR p_fora IS NULL OR p_casa < 0 OR p_fora < 0 THEN
    RAISE EXCEPTION 'Marcador inválido.';
  END IF;

  SELECT count(*),
    count(*) FILTER (WHERE pr.home_goals = p_casa AND pr.away_goals = p_fora),
    count(*) FILTER (WHERE (pr.home_goals, pr.away_goals) IS DISTINCT FROM (p_casa, p_fora)
      AND sign(pr.home_goals::numeric - pr.away_goals) = sign(p_casa::numeric - p_fora))
  INTO v_prognosticos, v_exatos, v_tendencias
  FROM public.predictions pr
  WHERE pr.match_id = p_jogo
    AND EXISTS (
      SELECT 1 FROM public.competition_members cm
      JOIN public.profiles p ON p.id = cm.user_id AND p.approval_status = 'approved'
      WHERE cm.competition_id = v_jogo.competition_id AND cm.user_id = pr.user_id
    );

  -- Os valores vêm da vista oficial na época ativa, descontando o multiplicador dos jogos bónus.
  WITH historico AS (
    SELECT ps.points::numeric / CASE WHEN m.is_bonus THEN 2 ELSE 1 END AS pontos,
      CASE
        WHEN pr.home_goals = m.home_score AND pr.away_goals = m.away_score THEN 'exato'
        WHEN sign(pr.home_goals::numeric - pr.away_goals) = sign(m.home_score::numeric - m.away_score) THEN 'tendencia'
        ELSE 'falhado'
      END AS acerto
    FROM public.prediction_scores ps
    JOIN public.matches m ON m.id = ps.match_id
    JOIN public.predictions pr ON pr.id = ps.prediction_id
    WHERE m.season_id = v_jogo.season_id AND m.competition_id = v_jogo.competition_id
      AND m.status = 'finished' AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL
      AND ps.points IS NOT NULL
  )
  SELECT min(pontos) FILTER (WHERE acerto = 'exato'), min(pontos) FILTER (WHERE acerto = 'tendencia'),
    count(DISTINCT pontos) FILTER (WHERE acerto = 'exato') <= 1
      AND count(DISTINCT pontos) FILTER (WHERE acerto = 'tendencia') <= 1
      AND COALESCE(bool_and(CASE WHEN acerto = 'falhado' THEN pontos = 0 ELSE pontos > 0 END), true)
  INTO v_exato, v_tendencia, v_regras_consistentes
  FROM historico;

  IF v_regras_consistentes AND (v_exatos = 0 OR v_exato IS NOT NULL)
    AND (v_tendencias = 0 OR v_tendencia IS NOT NULL) THEN
    WITH valores AS (
      SELECT c.user_id, c.jogador, c.pontos AS pontos_antes, c.resultados_exatos AS exatos_antes,
        c.pontos - COALESCE(ps.points, 0) +
          CASE WHEN v_jogo.is_bonus THEN 2 ELSE 1 END * CASE
            WHEN pr.home_goals = p_casa AND pr.away_goals = p_fora THEN COALESCE(v_exato, 0)
            WHEN sign(pr.home_goals::numeric - pr.away_goals) = sign(p_casa::numeric - p_fora)
              THEN COALESCE(v_tendencia, 0)
            ELSE 0 END AS pontos_depois,
        c.resultados_exatos - CASE WHEN ps.exact_score IS TRUE AND ps.points IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN pr.home_goals = p_casa AND pr.away_goals = p_fora THEN 1 ELSE 0 END AS exatos_depois
      FROM public.obter_classificacao(v_jogo.competition_id) c
      LEFT JOIN public.predictions pr ON pr.match_id = p_jogo AND pr.user_id = c.user_id
      LEFT JOIN public.prediction_scores ps ON ps.prediction_id = pr.id AND v_jogo.status = 'finished'
    ), ordenados AS (
      SELECT jogador,
        row_number() OVER (ORDER BY pontos_antes DESC, exatos_antes DESC, jogador ASC) AS antes,
        row_number() OVER (ORDER BY pontos_depois DESC, exatos_depois DESC, jogador ASC) AS depois,
        count(*) OVER (PARTITION BY pontos_antes, exatos_antes, jogador) AS empate_antes,
        count(*) OVER (PARTITION BY pontos_depois, exatos_depois, jogador) AS empate_depois
      FROM valores
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object('jogador', jogador, 'antes', antes, 'depois', depois)
      ORDER BY depois), '[]'::jsonb)
    INTO v_movimentos
    FROM ordenados WHERE antes <> depois AND empate_antes = 1 AND empate_depois = 1;
  END IF;

  RETURN jsonb_build_object(
    'prognosticos', v_prognosticos, 'exatos', v_exatos, 'tendencias', v_tendencias,
    'movimentos', v_movimentos
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.marcar_todas_notificacoes_lidas() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.desfazer_notificacoes_lidas(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prever_impacto_resultado(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_todas_notificacoes_lidas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.desfazer_notificacoes_lidas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prever_impacto_resultado(uuid, integer, integer) TO authenticated;

COMMIT;
