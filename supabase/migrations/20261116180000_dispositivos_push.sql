-- Predict League: registo de dispositivos, sem envio de notificações.
-- Não altera resultados, prognósticos, notificações nem políticas existentes.
-- Executar uma única vez. CREATE sem OR REPLACE preserva objetos preexistentes.
BEGIN;

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_endpoint_formato CHECK (
    octet_length(endpoint) <= 2048 AND endpoint ~ '^https://[^[:space:]]+$'
  ),
  CONSTRAINT push_p256dh_formato CHECK (p256dh ~ '^[A-Za-z0-9_-]{87}$'),
  CONSTRAINT push_auth_formato CHECK (auth ~ '^[A-Za-z0-9_-]{22}$')
);
CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Clientes podem consultar/remover apenas os próprios registos.
-- A criação e atualização passam exclusivamente pela função validada abaixo.
REVOKE ALL ON TABLE public.push_subscriptions FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.push_subscriptions TO authenticated;
GRANT ALL ON TABLE public.push_subscriptions TO service_role;
CREATE POLICY "Consultar dispositivos proprios" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Remover dispositivos proprios" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE FUNCTION public.registar_dispositivo_push(
  p_endpoint text, p_p256dh text, p_auth text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
  v_owner uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Inicia sessão para ativar as notificações.' USING ERRCODE = '42501';
  END IF;

  -- O bloqueio serializa inscrições concorrentes da mesma conta.
  -- Não modifica o perfil.
  PERFORM 1 FROM public.profiles p
  WHERE p.id = v_user AND p.approval_status = 'approved'
  FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.competition_members cm WHERE cm.user_id = v_user
  ) THEN
    RAISE EXCEPTION 'É necessário ser um participante aprovado.' USING ERRCODE = '42501';
  END IF;

  IF p_endpoint IS NULL OR octet_length(p_endpoint) > 2048
     OR p_endpoint !~ '^https://[^[:space:]]+$'
     OR p_p256dh IS NULL OR p_p256dh !~ '^[A-Za-z0-9_-]{87}$'
     OR p_auth IS NULL OR p_auth !~ '^[A-Za-z0-9_-]{22}$' THEN
    RAISE EXCEPTION 'Dados do dispositivo inválidos.' USING ERRCODE = '22023';
  END IF;

  SELECT s.id, s.user_id INTO v_id, v_owner
  FROM public.push_subscriptions s WHERE s.endpoint = p_endpoint FOR UPDATE;
  IF FOUND THEN
    IF v_owner <> v_user THEN
      RAISE EXCEPTION 'Volta a ativar as notificações neste dispositivo.' USING ERRCODE = '42501';
    END IF;
    UPDATE public.push_subscriptions
    SET p256dh = p_p256dh, auth = p_auth, updated_at = now()
    WHERE id = v_id AND user_id = v_user;
    RETURN v_id;
  END IF;

  IF (SELECT count(*) FROM public.push_subscriptions WHERE user_id = v_user) >= 10 THEN
    RAISE EXCEPTION 'Atingiste o limite de 10 dispositivos. Remove um antes de adicionar outro.';
  END IF;
  BEGIN
    INSERT INTO public.push_subscriptions(user_id, endpoint, p256dh, auth)
    VALUES (v_user, p_endpoint, p_p256dh, p_auth) RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Volta a ativar as notificações neste dispositivo.' USING ERRCODE = '42501';
  END;
  RETURN v_id;
END;
$function$;

-- A remoção continua disponível se a aprovação tiver sido revogada.
-- SECURITY INVOKER: a política RLS limita sempre a remoção à própria conta.
CREATE FUNCTION public.remover_dispositivo_push(p_endpoint text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $function$
  WITH removidos AS (
    DELETE FROM public.push_subscriptions
    WHERE endpoint = p_endpoint AND user_id = (SELECT auth.uid())
    RETURNING id
  ) SELECT EXISTS (SELECT 1 FROM removidos);
$function$;

REVOKE ALL ON FUNCTION public.registar_dispositivo_push(text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remover_dispositivo_push(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registar_dispositivo_push(text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remover_dispositivo_push(text) TO authenticated;
COMMENT ON TABLE public.push_subscriptions IS
  'Subscrições Web Push privadas por utilizador. Não contém a chave VAPID privada. Sem envio automático nesta migração.';
COMMENT ON FUNCTION public.registar_dispositivo_push(text,text,text) IS
  'Regista ou atualiza um dispositivo próprio de membro aprovado. Máximo 10 por conta; não transfere dispositivos entre contas.';

COMMIT;
