BEGIN;

CREATE TABLE IF NOT EXISTS public.calendar_team_aliases (
  competition_code text NOT NULL,
  alias text NOT NULL,
  official_name text NOT NULL,
  ambiguous boolean NOT NULL DEFAULT false,
  PRIMARY KEY (competition_code, alias)
);
ALTER TABLE public.calendar_team_aliases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calendar_team_aliases FROM PUBLIC, anon, authenticated, service_role;

INSERT INTO public.calendar_team_aliases (competition_code, alias, official_name)
VALUES
  ('SA', 'cagliari', 'cagliaricalcio'),
  ('SA', 'milan', 'acmilan'),
  ('SA', 'como', 'como1907'),
  ('SA', 'juventus', 'juventusfc'),
  ('SA', 'inter', 'fcinternazionalemilano'),
  ('SA', 'genova', 'genoacfc')
ON CONFLICT (competition_code, alias) DO NOTHING;

CREATE OR REPLACE FUNCTION public.guardar_emblemas_calendario(p_epoca uuid, p_competicao text, p_jogos jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_alterados integer;
  v_dominio constant text :=
    '^https://crests[.]football-data[.]org/[A-Za-z0-9_-]{1,100}[.](svg|png|webp)$';
BEGIN
  IF jsonb_typeof(p_jogos) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Lista de emblemas inválida.';
  END IF;
  IF jsonb_array_length(p_jogos) > 650 THEN
    RAISE EXCEPTION 'Lista de emblemas inválida.';
  END IF;

  WITH dados AS (
    SELECT fonte.id, fonte.casas, fonte.foras,
      CASE WHEN fonte.emblema_casa ~ v_dominio THEN fonte.emblema_casa END AS casa,
      CASE WHEN fonte.emblema_fora ~ v_dominio THEN fonte.emblema_fora END AS fora
    FROM jsonb_to_recordset(p_jogos) AS fonte(
      id bigint, casas text[], foras text[], emblema_casa text, emblema_fora text
    )
  ),
  importados AS (
    UPDATE public.matches m
      SET home_crest = COALESCE(d.casa, m.home_crest),
          away_crest = COALESCE(d.fora, m.away_crest)
    FROM dados d
    WHERE m.season_id = p_epoca AND m.football_data_competition = p_competicao
      AND m.football_data_match_id = d.id
      AND (COALESCE(d.casa, m.home_crest), COALESCE(d.fora, m.away_crest))
        IS DISTINCT FROM (m.home_crest, m.away_crest)
    RETURNING m.id
  ),
  equipas AS (
    SELECT casas[1] AS oficial, casas AS nomes, casa AS emblema FROM dados
    UNION ALL
    SELECT foras[1], foras, fora FROM dados
  ),
  nomes_para_emblemas AS (
    SELECT variante.nome, e.oficial, e.emblema
    FROM equipas e
    CROSS JOIN LATERAL unnest(e.nomes) AS variante(nome)
    UNION ALL
    SELECT a.alias, e.oficial, e.emblema
    FROM equipas e
    JOIN public.calendar_team_aliases a ON a.official_name = ANY(e.nomes)
    WHERE a.competition_code = p_competicao AND NOT a.ambiguous
  ),
  emblemas_por_nome AS (
    SELECT nome, min(oficial) AS oficial, min(emblema) AS emblema
    FROM nomes_para_emblemas
    WHERE oficial <> '' AND nome <> ''
    GROUP BY nome
    HAVING count(DISTINCT oficial) = 1 AND count(DISTINCT emblema) <= 1
  ),
  manuais AS (
    UPDATE public.matches m
      SET home_crest = COALESCE(m.home_crest, c.emblema),
          away_crest = COALESCE(m.away_crest, f.emblema)
    FROM emblemas_por_nome c, emblemas_por_nome f
    WHERE m.season_id = p_epoca AND m.football_data_match_id IS NULL
      AND p_competicao IS NOT NULL
      AND (m.football_data_competition IS NULL OR m.football_data_competition = p_competicao)
      AND c.nome = public.normalizar_equipa_calendario(m.home_team)
      AND f.nome = public.normalizar_equipa_calendario(m.away_team)
      AND c.oficial <> f.oficial
      AND ((m.home_crest IS NULL AND c.emblema IS NOT NULL)
        OR (m.away_crest IS NULL AND f.emblema IS NOT NULL))
    RETURNING m.id
  )
  SELECT (SELECT count(*) FROM importados) + (SELECT count(*) FROM manuais) INTO v_alterados;

  RETURN v_alterados;
END;
$function$;

COMMIT;
