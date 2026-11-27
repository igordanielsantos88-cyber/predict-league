BEGIN;

CREATE FUNCTION public.obter_jogos_das_notificacoes(p_notificacao_ids uuid[])
RETURNS TABLE (notificacao_id uuid, jogo_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT n.id, m.id
  FROM public.notifications n
  JOIN public.profiles p ON p.id = n.user_id AND p.approval_status = 'approved'
  JOIN public.matches m ON m.id = n.match_id AND m.jornada_id IS NOT NULL
  JOIN public.seasons ep ON ep.id = m.season_id AND ep.competition_id = m.competition_id
    AND ep.status = 'active'
  JOIN public.competitions c ON c.id = m.competition_id AND c.active
  WHERE n.user_id = (SELECT auth.uid())
    AND pg_catalog.cardinality(p_notificacao_ids) BETWEEN 1 AND 50
    AND n.id = ANY(p_notificacao_ids)
    AND EXISTS (
      SELECT 1 FROM public.competition_members cm
      WHERE cm.user_id = n.user_id AND cm.competition_id = m.competition_id
    );
$function$;

REVOKE ALL ON FUNCTION public.obter_jogos_das_notificacoes(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obter_jogos_das_notificacoes(uuid[]) TO authenticated;

COMMIT;
