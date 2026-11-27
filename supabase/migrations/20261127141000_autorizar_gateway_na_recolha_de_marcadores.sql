BEGIN;

-- O gateway do projeto requer a chave pública da API. O segredo continua a autorizar o agendador.
CREATE OR REPLACE FUNCTION public.solicitar_marcadores_calendario()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_chave text;
  v_apikey text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.matches m JOIN public.seasons s ON s.id = m.season_id AND s.status = 'active'
    LEFT JOIN public.calendar_result_reviews r ON r.match_id = m.id AND r.source_match_id = m.football_data_match_id
    WHERE m.football_data_match_id IS NOT NULL AND m.jornada_id IS NOT NULL
      AND m.kickoff <= now() - interval '90 minutes'
      AND (m.status = 'scheduled' OR (m.status = 'finished' AND (m.home_score IS NULL OR m.away_score IS NULL)))
      AND r.home_score IS NULL AND (r.checked_at IS NULL OR r.checked_at < now() - interval '15 minutes')
  ) THEN RETURN; END IF;

  SELECT decrypted_secret INTO v_chave FROM vault.decrypted_secrets WHERE name = 'CALENDAR_CRON_SECRET';
  IF v_chave IS NULL OR v_chave !~ '^[0-9a-f]{64}$' THEN RETURN; END IF;
  SELECT decrypted_secret INTO v_apikey FROM vault.decrypted_secrets WHERE name = 'CALENDAR_CRON_API_KEY';
  IF v_apikey IS NULL OR v_apikey !~ '^sb_publishable_[A-Za-z0-9_-]+$' THEN
    RAISE WARNING 'Recolha de marcadores: falta a chave pública CALENDAR_CRON_API_KEY no Vault.';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := 'https://lipnsydupzsjdgwhpmgl.supabase.co/functions/v1/sincronizar-calendario',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', v_apikey, 'x-calendar-cron-secret', v_chave),
    body := '{"acao":"recolher-marcadores"}'::jsonb,
    timeout_milliseconds := 60000);
END;
$function$;

COMMIT;
