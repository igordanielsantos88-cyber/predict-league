BEGIN;

ALTER TABLE public.matches
  ADD COLUMN home_crest text,
  ADD COLUMN away_crest text;

CREATE FUNCTION public.guardar_emblemas_calendario(p_epoca uuid, p_competicao text, p_jogos jsonb)
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
    SELECT fonte.id,
      CASE WHEN fonte.emblema_casa ~ v_dominio THEN fonte.emblema_casa END AS casa,
      CASE WHEN fonte.emblema_fora ~ v_dominio THEN fonte.emblema_fora END AS fora
    FROM jsonb_to_recordset(p_jogos) AS fonte(id bigint, emblema_casa text, emblema_fora text)
  )
  UPDATE public.matches m
    SET home_crest = COALESCE(d.casa, m.home_crest), away_crest = COALESCE(d.fora, m.away_crest)
  FROM dados d
  WHERE m.season_id = p_epoca AND m.football_data_competition = p_competicao
    AND m.football_data_match_id = d.id
    AND (COALESCE(d.casa, m.home_crest), COALESCE(d.fora, m.away_crest))
      IS DISTINCT FROM (m.home_crest, m.away_crest);
  GET DIAGNOSTICS v_alterados = ROW_COUNT;
  RETURN v_alterados;
END;
$function$;

REVOKE ALL ON FUNCTION public.guardar_emblemas_calendario(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_emblemas_calendario(uuid, text, jsonb) TO service_role;

COMMIT;
