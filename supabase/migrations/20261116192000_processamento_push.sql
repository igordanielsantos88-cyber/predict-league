-- Predict League: operações privadas do processador push.
-- Não ativa a fila, não cria agendamentos e não envia pedidos HTTP.
BEGIN;

CREATE FUNCTION public.dados_envio_push(p_fila_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
SELECT pg_catalog.jsonb_build_object(
  'id', q.id, 'claimToken', q.claim_token, 'subscriptionId', s.id,
  'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth,
  'expiresAt', LEAST(q.expires_at, CASE WHEN n.type = 'match_result' THEN q.expires_at ELSE m.kickoff END),
  'title', CASE n.type WHEN 'new_match' THEN '⚽ Novo jogo disponível'
    WHEN 'match_result' THEN '🏁 Resultado disponível' ELSE '⏰ Falta o teu prognóstico' END,
  'body', CASE WHEN n.type = 'match_result' THEN
      m.home_team || ' ' || m.home_score::text || ' - ' || m.away_score::text || ' ' || m.away_team
    WHEN n.type = 'new_match' THEN m.home_team || ' vs ' || m.away_team
    ELSE m.home_team || ' vs ' || m.away_team || ' — ainda não fizeste o teu prognóstico. Consulta o prazo na aplicação.' END
)
FROM public.push_delivery_queue q
JOIN public.notifications n ON n.id = q.notification_id
JOIN public.push_subscriptions s ON s.id = q.subscription_id AND s.user_id = n.user_id
JOIN public.profiles p ON p.id = n.user_id AND p.approval_status = 'approved'
JOIN public.matches m ON m.id = n.match_id
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

CREATE FUNCTION public.reservar_envio_push()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_item record;
  v_data jsonb;
  v_token uuid;
BEGIN
  -- Uma reserva abandonada tem resultado incerto: não reenviar automaticamente.
  UPDATE public.push_delivery_queue SET status = 'uncertain', error_code = 'worker_interrupted', updated_at = now()
    WHERE status = 'sending' AND claimed_at < now() - interval '2 minutes';
  UPDATE public.push_delivery_queue SET status = 'expired', updated_at = now()
    WHERE status = 'pending' AND expires_at <= now();
  PERFORM 1 FROM public.push_dispatch_settings WHERE singleton AND enabled FOR SHARE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  FOR v_item IN
    SELECT q.id FROM public.push_delivery_queue q
    WHERE q.status = 'pending' AND q.available_at <= now() AND q.expires_at > now()
    ORDER BY q.created_at, q.id LIMIT 50 FOR UPDATE SKIP LOCKED
  LOOP
    v_data := public.dados_envio_push(v_item.id);
    IF v_data IS NULL THEN
      UPDATE public.push_delivery_queue SET status = 'cancelled', error_code = 'no_longer_eligible', updated_at = now()
        WHERE id = v_item.id;
      CONTINUE;
    END IF;
    v_token := gen_random_uuid();
    UPDATE public.push_delivery_queue SET status = 'sending', attempts = attempts + 1,
      claimed_at = now(), claim_token = v_token, updated_at = now()
      WHERE id = v_item.id;
    RETURN v_data || pg_catalog.jsonb_build_object('claimToken', v_token);
  END LOOP;
  RETURN NULL;
END;
$function$;

CREATE FUNCTION public.confirmar_envio_push(p_fila_id uuid, p_claim_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
SELECT public.dados_envio_push(q.id)
FROM public.push_delivery_queue q
WHERE q.id = p_fila_id AND q.status = 'sending' AND q.claim_token = p_claim_token
  AND q.claimed_at >= now() - interval '1 minute';
$function$;

CREATE FUNCTION public.concluir_envio_push(
  p_fila_id uuid, p_claim_token uuid, p_estado text,
  p_http integer DEFAULT NULL, p_erro text DEFAULT NULL,
  p_p256dh text DEFAULT NULL, p_auth text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_q public.push_delivery_queue%ROWTYPE;
BEGIN
  IF p_estado IS NULL OR p_estado NOT IN ('accepted','failed','uncertain','cancelled','pending')
    OR (p_http IS NOT NULL AND p_http NOT BETWEEN 100 AND 599)
    OR (p_erro IS NOT NULL AND p_erro NOT IN ('endpoint_unsupported','prepare_failed','transport_uncertain',
      'provider_rejected','rate_limited','no_longer_eligible','subscription_expired')) THEN
    RAISE EXCEPTION 'Conclusão de envio inválida.';
  END IF;
  IF p_estado = 'accepted' AND (p_http IS NULL OR p_http NOT BETWEEN 200 AND 299) THEN
    RAISE EXCEPTION 'Aceitação sem confirmação do fornecedor.';
  END IF;
  IF p_estado = 'pending' AND p_http IS DISTINCT FROM 429 THEN
    RAISE EXCEPTION 'Só uma rejeição explícita 429 permite nova tentativa.';
  END IF;
  SELECT * INTO v_q FROM public.push_delivery_queue
    WHERE id = p_fila_id AND claim_token = p_claim_token AND status = 'sending' FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.push_delivery_queue SET
    status = CASE WHEN p_estado = 'pending' AND (attempts >= 3 OR expires_at <= now() + interval '1 minute')
      THEN 'failed' ELSE p_estado END,
    available_at = CASE WHEN p_estado = 'pending' THEN now() + interval '1 minute' ELSE available_at END,
    provider_status = p_http, error_code = p_erro, updated_at = now()
    WHERE id = v_q.id;
  IF p_http IN (404,410) AND p_estado = 'failed' THEN
    -- Uma renovação entretanto feita não pode ser eliminada por um pedido antigo.
    DELETE FROM public.push_subscriptions WHERE id = v_q.subscription_id
      AND p256dh = p_p256dh AND auth = p_auth AND updated_at <= v_q.created_at;
  END IF;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.dados_envio_push(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reservar_envio_push() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirmar_envio_push(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.concluir_envio_push(uuid,uuid,text,integer,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dados_envio_push(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reservar_envio_push() TO service_role;
GRANT EXECUTE ON FUNCTION public.confirmar_envio_push(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.concluir_envio_push(uuid,uuid,text,integer,text,text,text) TO service_role;
COMMIT;
