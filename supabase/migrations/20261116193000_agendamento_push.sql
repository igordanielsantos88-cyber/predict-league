-- Predict League: verificação da fila a cada minuto.
-- NÃO ativa o envio; mantém enabled=false e admin_only=true.
-- Não altera o agendamento existente dos lembretes.
BEGIN;

DO $preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.push_dispatch_settings WHERE singleton AND NOT enabled AND admin_only) THEN
    RAISE EXCEPTION 'Antes de instalar, a fila deve estar desligada e limitada a administradores.';
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'predict-league-push') THEN
    RAISE EXCEPTION 'O agendamento predict-league-push já existe. Não o substituir automaticamente.';
  END IF;
  IF (SELECT count(*) FROM vault.decrypted_secrets WHERE name = 'PUSH_CRON_SECRET') <> 1 THEN
    RAISE EXCEPTION 'Deve existir exatamente uma chave PUSH_CRON_SECRET no Vault.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'PUSH_CRON_SECRET'
    AND decrypted_secret ~ '^[0-9a-f]{64}$') THEN
    RAISE EXCEPTION 'A chave do Vault não tem o formato esperado.';
  END IF;
END;
$preflight$;

ALTER TABLE public.push_dispatch_settings
  ADD COLUMN last_request_id bigint,
  ADD COLUMN last_requested_at timestamptz;

CREATE FUNCTION public.solicitar_processamento_push()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_secret text;
  v_request bigint;
  v_settings public.push_dispatch_settings%ROWTYPE;
BEGIN
  -- Serializa chamadas concorrentes do agendador; o processador reserva cada aviso.
  SELECT * INTO v_settings FROM public.push_dispatch_settings WHERE singleton FOR UPDATE;
  IF NOT FOUND OR NOT v_settings.enabled THEN RETURN NULL; END IF;
  IF v_settings.last_requested_at > clock_timestamp() - interval '55 seconds' THEN RETURN NULL; END IF;

  -- Expirados/interrompidos também são trabalho: o processador termina esses estados.
  IF NOT EXISTS (SELECT 1 FROM public.push_delivery_queue q
    WHERE (q.status = 'pending' AND q.available_at <= now())
      OR (q.status = 'sending' AND q.claimed_at < now() - interval '2 minutes')) THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO STRICT v_secret
  FROM vault.decrypted_secrets WHERE name = 'PUSH_CRON_SECRET';
  IF v_secret IS NULL OR v_secret !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Formato de credencial inválido.';
  END IF;

  SELECT net.http_post(
    url := 'https://lipnsydupzsjdgwhpmgl.supabase.co/functions/v1/processar-push',
    headers := pg_catalog.jsonb_build_object('Content-Type', 'application/json', 'x-push-cron-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) INTO v_request;
  UPDATE public.push_dispatch_settings
    SET last_request_id = v_request, last_requested_at = clock_timestamp() WHERE singleton;
  RETURN v_request;
EXCEPTION WHEN OTHERS THEN
  -- Não escrever a chave, cabeçalhos ou pedidos em mensagens de erro.
  RAISE WARNING 'Agendamento push: pedido não criado (SQLSTATE %).', SQLSTATE;
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.solicitar_processamento_push() FROM PUBLIC, anon, authenticated, service_role;

SELECT cron.schedule(
  'predict-league-push',
  '* * * * *',
  'SELECT public.solicitar_processamento_push();'
);

COMMENT ON FUNCTION public.solicitar_processamento_push() IS
  'Invocação privada por pg_cron, com chave do Vault. Sem chamada HTTP se desligado ou sem trabalho. O ID devolvido confirma apenas a criação do pedido.';
COMMIT;
