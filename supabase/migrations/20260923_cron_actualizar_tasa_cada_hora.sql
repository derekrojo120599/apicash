-- Migration: Schedule exchange rate update every hour (24/7)
-- Extensions required: pg_cron, pg_net

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedules prior job if existing to avoid duplicates
SELECT cron.unschedule('update-exchange-rate-job') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'update-exchange-rate-job'
);

-- Schedule to run at the start of every hour (24 times a day)
SELECT cron.schedule(
  'update-exchange-rate-job',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jkoxmyefjmokdycjlfqb.supabase.co/functions/v1/update-exchange-rate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-CRON-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);