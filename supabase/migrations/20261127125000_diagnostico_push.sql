BEGIN;

CREATE INDEX push_delivery_created_at_idx ON public.push_delivery_queue(created_at);

CREATE FUNCTION public.obter_diagnostico_push()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_desde timestamptz := now() - interval '7 days';
  v_config public.push_dispatch_settings%ROWTYPE;
  v_contagens jsonb;
  v_motivos jsonb;
  v_ultimo_aceite timestamptz;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin' AND p.approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Diagnóstico reservado a administradores.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_config FROM public.push_dispatch_settings WHERE singleton;

  SELECT jsonb_build_object(
    'pending', count(*) FILTER (WHERE status = 'pending'),
    'sending', count(*) FILTER (WHERE status = 'sending'),
    'accepted', count(*) FILTER (WHERE status = 'accepted'),
    'failed', count(*) FILTER (WHERE status = 'failed'),
    'uncertain', count(*) FILTER (WHERE status = 'uncertain'),
    'cancelled', count(*) FILTER (WHERE status = 'cancelled'),
    'expired', count(*) FILTER (WHERE status = 'expired')
  ), max(updated_at) FILTER (WHERE status = 'accepted')
  INTO v_contagens, v_ultimo_aceite
  FROM public.push_delivery_queue WHERE created_at >= v_desde;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'codigo', f.error_code, 'http', f.provider_status, 'total', f.total
  ) ORDER BY f.total DESC, f.error_code, f.provider_status), '[]'::jsonb)
  INTO v_motivos
  FROM (
    SELECT error_code, provider_status, count(*) AS total
    FROM public.push_delivery_queue
    WHERE created_at >= v_desde AND status IN ('failed', 'uncertain')
    GROUP BY error_code, provider_status
    ORDER BY total DESC, error_code, provider_status
    LIMIT 10
  ) f;

  RETURN jsonb_build_object(
    'envioAtivo', COALESCE(v_config.enabled, false),
    'soAdministradores', COALESCE(v_config.admin_only, false),
    'desde', v_desde,
    'atualizadoEm', now(),
    'ultimoAceiteEm', v_ultimo_aceite,
    'contagens', v_contagens,
    'motivos', v_motivos
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.obter_diagnostico_push() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obter_diagnostico_push() TO authenticated;

COMMIT;
