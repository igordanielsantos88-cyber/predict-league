-- Personaliza o push de resultado com a pontuação atual do destinatário.
BEGIN;

CREATE OR REPLACE FUNCTION public.dados_envio_push(p_fila_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
SELECT pg_catalog.jsonb_build_object(
  'id', q.id, 'claimToken', q.claim_token, 'subscriptionId', s.id,
  'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth,
  'expiresAt', LEAST(q.expires_at, CASE WHEN n.type = 'match_result' THEN q.expires_at ELSE m.kickoff END),
  'title', CASE n.type
    WHEN 'new_match' THEN '⚽ Novo jogo disponível'
    WHEN 'match_result' THEN CASE
      WHEN ps.exact_score IS TRUE THEN '🎯 Acertaste no resultado exato!'
      WHEN ps.points > 0 THEN '✅ Acertaste na tendência!'
      WHEN ps.points = 0 THEN '❌ Não acertaste no prognóstico'
      ELSE '🏁 Resultado disponível'
    END
    ELSE '⏰ Falta o teu prognóstico'
  END,
  'body', CASE WHEN n.type = 'match_result' THEN
      m.home_team || ' ' || m.home_score::text || ' - ' || m.away_score::text || ' ' || m.away_team ||
        CASE WHEN ps.prediction_id IS NULL THEN ' · Não fizeste prognóstico.' ELSE '' END
    WHEN n.type = 'new_match' THEN m.home_team || ' vs ' || m.away_team
    ELSE m.home_team || ' vs ' || m.away_team || ' — ainda não fizeste o teu prognóstico. Consulta o prazo na aplicação.' END
)
FROM public.push_delivery_queue q
JOIN public.notifications n ON n.id = q.notification_id
JOIN public.push_subscriptions s ON s.id = q.subscription_id AND s.user_id = n.user_id
JOIN public.profiles p ON p.id = n.user_id AND p.approval_status = 'approved'
JOIN public.matches m ON m.id = n.match_id
LEFT JOIN public.prediction_scores ps
  ON n.type = 'match_result' AND ps.match_id = m.id AND ps.user_id = n.user_id
JOIN public.seasons ep ON ep.id = m.season_id AND ep.competition_id = m.competition_id AND ep.status = 'active'
JOIN public.push_dispatch_settings cfg ON cfg.singleton AND cfg.enabled
WHERE q.id = p_fila_id AND q.status IN ('pending', 'sending')
  AND q.expires_at > now() AND NOT n.is_read
  AND n.created_at >= cfg.activated_at AND n.created_at <= now() + interval '1 minute'
  AND q.created_at >= cfg.activated_at
  AND s.created_at <= q.created_at AND s.updated_at <= q.created_at
  AND (NOT cfg.admin_only OR p.role = 'admin')
  AND EXISTS (SELECT 1 FROM public.competition_members cm
    WHERE cm.user_id = n.user_id AND cm.competition_id = m.competition_id)
  AND (
    (n.type = 'new_match' AND m.status = 'scheduled' AND m.kickoff > now())
    OR (n.type = 'match_result' AND m.status = 'finished' AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL)
    OR (n.type IN ('reminder_1h_' || m.id::text, 'reminder_24h_' || m.id::text)
      AND m.status = 'scheduled' AND m.kickoff > now()
      AND NOT EXISTS (SELECT 1 FROM public.predictions pr WHERE pr.match_id = m.id AND pr.user_id = n.user_id)
      AND ((n.type = 'reminder_1h_' || m.id::text AND m.kickoff <= now() + interval '1 hour')
        OR (n.type = 'reminder_24h_' || m.id::text AND m.kickoff > now() + interval '23 hours'
          AND m.kickoff <= now() + interval '24 hours')))
  );
$function$;

COMMIT;
