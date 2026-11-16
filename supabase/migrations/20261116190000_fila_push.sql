-- Predict League: preparação da fila de envio automático.
-- Fica DESLIGADA. Não envia pedidos HTTP nem cria agendamentos.
-- Não modifica notificações existentes, jogos, resultados ou prognósticos.
-- Aplicar uma única vez, depois da migração de dispositivos push.
BEGIN;

CREATE TABLE public.push_dispatch_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false,
  admin_only boolean NOT NULL DEFAULT true,
  activated_at timestamptz,
  CHECK (NOT enabled OR activated_at IS NOT NULL)
);
INSERT INTO public.push_dispatch_settings(singleton) VALUES (true);
ALTER TABLE public.push_dispatch_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_dispatch_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.push_dispatch_settings TO service_role;

CREATE TABLE public.push_delivery_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  dedup_key text NOT NULL CHECK (length(dedup_key) <= 200),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sending', 'accepted', 'failed', 'cancelled', 'expired', 'uncertain'
  )),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
  available_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  claimed_at timestamptz,
  claim_token uuid,
  provider_status integer CHECK (provider_status BETWEEN 100 AND 599),
  error_code text CHECK (length(error_code) <= 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_delivery_once UNIQUE(subscription_id, dedup_key),
  CHECK (expires_at > created_at)
);
CREATE INDEX push_delivery_pending_idx
  ON public.push_delivery_queue(available_at, created_at, id) WHERE status = 'pending';
CREATE INDEX push_delivery_notification_idx ON public.push_delivery_queue(notification_id);
ALTER TABLE public.push_delivery_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_delivery_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_delivery_queue TO service_role;

CREATE FUNCTION public.enfileirar_nova_notificacao_push()
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
REVOKE ALL ON FUNCTION public.enfileirar_nova_notificacao_push() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER enfileirar_nova_notificacao_push
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.enfileirar_nova_notificacao_push();

COMMENT ON TABLE public.push_dispatch_settings IS
  'Interruptor do envio automático, inicialmente desligado e limitado a administradores. A ativação exige data de corte nova.';
COMMENT ON TABLE public.push_delivery_queue IS
  'Fila privada, sem conteúdo de mensagens nem chaves. accepted significa aceite pelo fornecedor, não entrega confirmada. O consumidor deve revalidar permissões e validade do aviso antes de enviar.';

COMMIT;
