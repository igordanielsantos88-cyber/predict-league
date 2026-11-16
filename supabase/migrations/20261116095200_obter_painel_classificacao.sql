-- Predict League — proposta aditiva, ainda não aplicada ao Supabase.
-- Cria UMA função de leitura. Não altera tabelas, resultados, políticas,
-- vista de pontuação ou as três funções de classificação existentes.
-- Executar só após revisão e decisão de aplicar esta alteração de estrutura.
-- CREATE FUNCTION (sem OR REPLACE) evita substituir uma função já existente.
BEGIN;

DO $preflight$
DECLARE
  assinatura text;
  funcao regprocedure;
BEGIN
  FOREACH assinatura IN ARRAY ARRAY[
    'public.obter_classificacao(uuid)',
    'public.obter_classificacao_ate_jornada(uuid,integer)',
    'public.obter_classificacao_jornada(uuid,uuid)'
  ] LOOP
    funcao := pg_catalog.to_regprocedure(assinatura);
    IF funcao IS NULL THEN
      RAISE EXCEPTION 'Falta a função necessária: %', assinatura;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid = funcao AND p.provolatile = 's'
    ) THEN
      RAISE EXCEPTION 'A função % deve ser STABLE. Rever antes de continuar.', assinatura;
    END IF;
  END LOOP;
END;
$preflight$;

CREATE FUNCTION public.obter_painel_classificacao(
  p_competition_id uuid,
  p_jornada_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_utilizador uuid := auth.uid();
  v_epocas uuid[];
  v_epoca uuid;
  v_jornada record;
  v_jornadas jsonb := '[]'::jsonb;
  v_jogos jsonb := '[]'::jsonb;
  v_selecionada uuid;
  v_primeira uuid;
  v_ultima jsonb := NULL;
  v_anterior jsonb := NULL;
  v_numero_esperado integer := 1;
  v_bloqueada boolean := false;
  v_geral jsonb := '[]'::jsonb;
  v_por_jornada jsonb := '[]'::jsonb;
  v_acumulada jsonb := '[]'::jsonb;
  v_acumulada_anterior jsonb := '[]'::jsonb;
BEGIN
  -- SECURITY DEFINER: verificar explicitamente o acesso antes de ler dados.
  IF v_utilizador IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.competition_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.competition_id = p_competition_id
      AND cm.user_id = v_utilizador
      AND p.approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Não tens acesso a esta competição.' USING ERRCODE = '42501';
  END IF;

  SELECT pg_catalog.array_agg(s.id)
  INTO v_epocas
  FROM public.seasons s
  WHERE s.competition_id = p_competition_id AND s.status = 'active';

  IF COALESCE(pg_catalog.cardinality(v_epocas), 0) <> 1 THEN
    RAISE EXCEPTION 'Deve existir exatamente uma época ativa nesta competição.';
  END IF;
  v_epoca := v_epocas[1];

  IF EXISTS (
    SELECT 1 FROM public.jornadas j
    WHERE j.competition_id = p_competition_id AND j.season_id = v_epoca
    GROUP BY j.numero HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Existem números de jornada repetidos na época ativa.';
  END IF;

  FOR v_jornada IN
    SELECT j.id, j.numero, j.nome,
      COUNT(m.id) > 0 AND COALESCE(
        bool_and(m.status = 'finished' AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL),
        false
      ) AS concluida
    FROM public.jornadas j
    LEFT JOIN public.matches m ON m.jornada_id = j.id
      AND m.competition_id = p_competition_id AND m.season_id = v_epoca
    WHERE j.competition_id = p_competition_id AND j.season_id = v_epoca
    GROUP BY j.id, j.numero, j.nome
    ORDER BY j.numero ASC NULLS LAST, j.id
  LOOP
    v_jornadas := v_jornadas || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'id', v_jornada.id, 'numero', v_jornada.numero, 'nome', v_jornada.nome
      )
    );
    IF v_primeira IS NULL THEN v_primeira := v_jornada.id; END IF;
    IF v_jornada.id = p_jornada_id THEN v_selecionada := v_jornada.id; END IF;

    -- Avança só por jornadas 1, 2, 3... concluídas, sem saltar lacunas.
    IF NOT v_bloqueada AND v_jornada.numero = v_numero_esperado AND v_jornada.concluida THEN
      v_anterior := v_ultima;
      v_ultima := pg_catalog.jsonb_build_object(
        'id', v_jornada.id, 'numero', v_jornada.numero, 'nome', v_jornada.nome
      );
      v_numero_esperado := v_numero_esperado + 1;
    ELSE
      v_bloqueada := true;
    END IF;
  END LOOP;
  v_selecionada := COALESCE(v_selecionada, v_primeira);

  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id', m.id, 'jornada_id', m.jornada_id, 'status', m.status,
    'resultado_valido', m.home_score IS NOT NULL AND m.away_score IS NOT NULL
  ) ORDER BY m.id), '[]'::jsonb)
  INTO v_jogos
  FROM public.matches m
  JOIN public.jornadas j ON j.id = m.jornada_id
    AND j.competition_id = p_competition_id AND j.season_id = v_epoca
  WHERE m.competition_id = p_competition_id AND m.season_id = v_epoca;

  -- Reutiliza a pontuação e a ordenação atuais; não duplica as regras de pontos.
  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c)
    ORDER BY c.pontos DESC, c.resultados_exatos DESC, c.jogador ASC), '[]'::jsonb)
  INTO v_geral FROM public.obter_classificacao(p_competition_id) c;

  IF v_selecionada IS NOT NULL THEN
    SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c)
      ORDER BY c.pontos DESC, c.resultados_exatos DESC, c.jogador ASC), '[]'::jsonb)
    INTO v_por_jornada
    FROM public.obter_classificacao_jornada(p_competition_id, v_selecionada) c;
  END IF;

  IF v_ultima IS NOT NULL THEN
    SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c)
      ORDER BY c.pontos DESC, c.resultados_exatos DESC, c.jogador ASC), '[]'::jsonb)
    INTO v_acumulada
    FROM public.obter_classificacao_ate_jornada(p_competition_id, (v_ultima ->> 'numero')::integer) c;
  END IF;

  IF v_anterior IS NOT NULL THEN
    SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c)
      ORDER BY c.pontos DESC, c.resultados_exatos DESC, c.jogador ASC), '[]'::jsonb)
    INTO v_acumulada_anterior
    FROM public.obter_classificacao_ate_jornada(p_competition_id, (v_anterior ->> 'numero')::integer) c;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'versao', 1, 'competicaoId', p_competition_id, 'epocaId', v_epoca,
    'utilizadorAtual', v_utilizador,
    'jornadas', v_jornadas, 'jornadaSelecionada', v_selecionada,
    'jogos', v_jogos, 'ultima', v_ultima, 'anterior', v_anterior,
    'geral', v_geral, 'porJornada', v_por_jornada,
    'acumulada', v_acumulada, 'acumuladaAnterior', v_acumulada_anterior
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.obter_painel_classificacao(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.obter_painel_classificacao(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.obter_painel_classificacao(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.obter_painel_classificacao(uuid, uuid) IS
  'Leitura consistente da classificação da época ativa. Requer membro aprovado; sem alterações de dados.';

COMMIT;
