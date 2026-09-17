-- Migration: Schedule exchange rate update 6 times per day (Venezuela business hours: 8am, 10am, 12pm, 2pm, 4pm, 6pm UTC-4 -> 12, 14, 16, 18, 20, 22 UTC)
-- Extensions required: pg_cron, pg_net

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedules prior job if existing to avoid duplicates
SELECT cron.unschedule('update-exchange-rate-job') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'update-exchange-rate-job'
);

-- Schedule to run at 12:00, 14:00, 16:00, 18:00, 20:00, 22:00 UTC (8am to 6pm Venezuela time every 2 hours)
SELECT cron.schedule(
  'update-exchange-rate-job',
  '0 12,14,16,18,20,22 * * *',
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
