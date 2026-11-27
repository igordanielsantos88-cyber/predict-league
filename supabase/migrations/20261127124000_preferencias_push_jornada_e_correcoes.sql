BEGIN;

CREATE FUNCTION public.obter_destinos_das_notificacoes(p_notificacao_ids uuid[])
RETURNS TABLE (notificacao_id uuid, jogo_id uuid, jornada_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT l.notificacao_id, l.jogo_id, CASE WHEN n.type = 'match_result' THEN m.jornada_id END
  FROM public.obter_jogos_das_notificacoes(p_notificacao_ids) l
  JOIN public.notifications n ON n.id = l.notificacao_id
  JOIN public.matches m ON m.id = l.jogo_id;
$function$;

REVOKE ALL ON FUNCTION public.obter_destinos_das_notificacoes(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obter_destinos_das_notificacoes(uuid[]) TO authenticated;

CREATE TABLE public.match_result_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  changed_by uuid,
  changed_by_name text,
  old_home_score integer NOT NULL,
  old_away_score integer NOT NULL,
  new_home_score integer NOT NULL,
  new_away_score integer NOT NULL
);

CREATE INDEX match_result_corrections_match_idx ON public.match_result_corrections(match_id, changed_at DESC);
ALTER TABLE public.match_result_corrections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.match_result_corrections FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.registar_correcao_resultado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  INSERT INTO public.match_result_corrections (
    match_id, changed_by, changed_by_name, old_home_score, old_away_score, new_home_score, new_away_score
  ) VALUES (
    NEW.id, v_user, (SELECT NULLIF(p.display_name, '') FROM public.profiles p WHERE p.id = v_user),
    OLD.home_score, OLD.away_score, NEW.home_score, NEW.away_score
  );
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.registar_correcao_resultado() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER registar_correcao_resultado
AFTER UPDATE OF home_score, away_score ON public.matches
FOR EACH ROW WHEN (
  OLD.status = 'finished' AND NEW.status = 'finished'
  AND OLD.home_score IS NOT NULL AND OLD.away_score IS NOT NULL
  AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL
  AND (OLD.home_score IS DISTINCT FROM NEW.home_score OR OLD.away_score IS DISTINCT FROM NEW.away_score)
)
EXECUTE FUNCTION public.registar_correcao_resultado();

CREATE FUNCTION public.obter_historico_resultado(p_match_id uuid)
RETURNS SETOF public.match_result_corrections
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin' AND p.approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Histórico reservado a administradores.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY SELECT c.* FROM public.match_result_corrections c
    WHERE c.match_id = p_match_id ORDER BY c.changed_at DESC, c.id DESC LIMIT 50;
END;
$function$;

REVOKE ALL ON FUNCTION public.obter_historico_resultado(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obter_historico_resultado(uuid) TO authenticated;

CREATE TABLE public.push_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  new_matches boolean NOT NULL,
  reminders boolean NOT NULL,
  results boolean NOT NULL
);

ALTER TABLE public.push_notification_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_notification_preferences FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.obter_preferencias_push()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT jsonb_build_object('conta', p.id,
    'new_matches', COALESCE(pref.new_matches, true),
    'reminders', COALESCE(pref.reminders, true),
    'results', COALESCE(pref.results, true))
  FROM public.profiles p
  LEFT JOIN public.push_notification_preferences pref ON pref.user_id = p.id
  WHERE p.id = auth.uid() AND p.approval_status = 'approved';
$function$;

CREATE FUNCTION public.tipo_push_permitido(p_user_id uuid, p_tipo text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT COALESCE((
    SELECT CASE p_tipo
      WHEN 'new_match' THEN pref.new_matches
      WHEN 'match_result' THEN pref.results
      ELSE pref.reminders
    END
    FROM public.push_notification_preferences pref WHERE pref.user_id = p_user_id
  ), true);
$function$;

CREATE FUNCTION public.guardar_preferencias_push(
  p_conta uuid, p_new_matches boolean, p_reminders boolean, p_results boolean
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF p_conta IS NULL OR p_conta IS DISTINCT FROM auth.uid() OR NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = p_conta AND p.approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Não tens acesso a estas preferências.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.push_notification_preferences (user_id, new_matches, reminders, results)
  VALUES (p_conta, p_new_matches, p_reminders, p_results)
  ON CONFLICT (user_id) DO UPDATE SET
    new_matches = EXCLUDED.new_matches, reminders = EXCLUDED.reminders, results = EXCLUDED.results;

  UPDATE public.push_delivery_queue q
  SET status = 'cancelled', error_code = 'push_preference_disabled', updated_at = now()
  FROM public.notifications n
  WHERE q.notification_id = n.id AND n.user_id = p_conta AND q.status = 'pending'
    AND NOT public.tipo_push_permitido(n.user_id, n.type);

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.tipo_push_permitido(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.obter_preferencias_push() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guardar_preferencias_push(uuid, boolean, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obter_preferencias_push() TO authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_preferencias_push(uuid, boolean, boolean, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.enfileirar_nova_notificacao_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_settings public.push_dispatch_settings%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_key text;
BEGIN
  SELECT * INTO v_settings FROM public.push_dispatch_settings WHERE singleton;
  IF NOT FOUND OR NOT v_settings.enabled THEN RETURN NEW; END IF;

  -- Só avisos novos, ainda não lidos e de tipos conhecidos. Sem carga histórica.
  IF NEW.is_read OR NEW.created_at < v_settings.activated_at
     OR NEW.created_at < v_now - interval '10 minutes'
     OR NEW.created_at > v_now + interval '1 minute'
     OR NOT public.tipo_push_permitido(NEW.user_id, NEW.type)
     OR NOT (
       NEW.type IN ('new_match', 'match_result')
       OR NEW.type ~ '^reminder_(24h|1h)_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     ) THEN RETURN NEW; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.user_id AND p.approval_status = 'approved'
      AND (NOT v_settings.admin_only OR p.role = 'admin')
      AND EXISTS (SELECT 1 FROM public.competition_members cm WHERE cm.user_id = p.id)
  ) THEN RETURN NEW; END IF;

  -- Os lembretes do mesmo jogo/tipo não voltam a entrar para o mesmo dispositivo.
  v_key := CASE WHEN NEW.type LIKE 'reminder_%'
    THEN 'reminder:' || NEW.user_id::text || ':' || lower(NEW.type)
    ELSE 'notification:' || NEW.id::text END;

  INSERT INTO public.push_delivery_queue (
    notification_id, subscription_id, dedup_key, available_at, expires_at, created_at, updated_at
  )
  SELECT NEW.id, s.id, v_key, v_now,
    LEAST(v_now + interval '10 minutes', NEW.created_at + interval '10 minutes'), v_now, v_now
  FROM public.push_subscriptions s
  WHERE s.user_id = NEW.user_id AND s.created_at <= v_now
  ON CONFLICT (subscription_id, dedup_key) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A fila push é acessória: um erro não deve impedir o aviso, jogo ou resultado.
  -- Só o código SQL é registado; nunca conteúdos, chaves ou endpoints.
  RAISE WARNING 'Fila push: inserção ignorada (SQLSTATE %).', SQLSTATE;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.dados_envio_push(p_fila_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
SELECT pg_catalog.jsonb_build_object(
  'id', q.id, 'claimToken', q.claim_token, 'subscriptionId', s.id, 'matchId', m.id,
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
  AND public.tipo_push_permitido(n.user_id, n.type)
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
