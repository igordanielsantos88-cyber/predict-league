-- Predict League: ligar os NOVOS avisos ao jogo de origem.
-- Mantém as mensagens, destinatários e condições das duas funções existentes.
-- Não preenche avisos antigos e não ativa o envio automático.
BEGIN;

DO $preflight$
BEGIN
  IF pg_catalog.to_regprocedure('public.notificar_novo_jogo()') IS NULL
     OR pg_catalog.to_regprocedure('public.notificar_resultado_jogo()') IS NULL THEN
    RAISE EXCEPTION 'Faltam as funções existentes de notificação. Operação cancelada.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.push_dispatch_settings WHERE singleton AND NOT enabled
  ) THEN
    RAISE EXCEPTION 'A fila push tem de estar desligada durante esta preparação.';
  END IF;
END;
$preflight$;

ALTER TABLE public.notifications ADD COLUMN match_id uuid
  REFERENCES public.matches(id) ON DELETE SET NULL;
CREATE INDEX notifications_match_id_idx ON public.notifications(match_id)
  WHERE match_id IS NOT NULL;
COMMENT ON COLUMN public.notifications.match_id IS
  'Jogo de origem dos novos avisos. NULL nos avisos antigos/gerais. A eliminação do jogo preserva o texto do aviso e remove apenas esta ligação.';

CREATE OR REPLACE FUNCTION public.notificar_novo_jogo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NEW.status = 'scheduled' THEN
    INSERT INTO public.notifications (user_id, title, message, type, match_id)
    SELECT cm.user_id,
      '⚽ Novo jogo disponível',
      NEW.home_team || ' vs ' || NEW.away_team,
      'new_match',
      NEW.id
    FROM public.competition_members AS cm
    JOIN public.profiles AS p ON p.id = cm.user_id
    WHERE cm.competition_id = NEW.competition_id
      AND p.approval_status = 'approved';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notificar_resultado_jogo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF NEW.status = 'finished'
     AND OLD.status IS DISTINCT FROM 'finished'
     AND NEW.home_score IS NOT NULL
     AND NEW.away_score IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, match_id)
    SELECT cm.user_id,
      '🏁 Resultado disponível',
      NEW.home_team || ' ' || NEW.home_score::text || ' - ' ||
        NEW.away_score::text || ' ' || NEW.away_team,
      'match_result',
      NEW.id
    FROM public.competition_members AS cm
    JOIN public.profiles AS p ON p.id = cm.user_id
    WHERE cm.competition_id = NEW.competition_id
      AND p.approval_status = 'approved';
  END IF;
  RETURN NEW;
END;
$function$;

-- O agendamento existente codifica o UUID no tipo reminder_24h_UUID/ reminder_1h_UUID.
-- Aproveita essa referência sem substituir a função que gera os lembretes.
CREATE FUNCTION public.associar_jogo_lembrete_notificacao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_match uuid;
BEGIN
  IF NEW.match_id IS NULL AND
     NEW.type ~ '^reminder_(24h|1h)_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    SELECT m.id INTO v_match FROM public.matches m
    WHERE m.id = pg_catalog.right(NEW.type, 36)::uuid;
    NEW.match_id := v_match;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.associar_jogo_lembrete_notificacao() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER associar_jogo_lembrete_notificacao
BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.associar_jogo_lembrete_notificacao();

COMMIT;
