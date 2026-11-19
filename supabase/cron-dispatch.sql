-- Run once in the Supabase SQL Editor after the app is deployed.
-- Replace <APP_URL> (e.g. https://commute-notice.vercel.app) and <CRON_SECRET> (same value as the
-- deployment's CRON_SECRET env var). Re-running replaces the existing job of the same name.

select cron.schedule(
  'commute-dispatch',
  '* * * * *',
  $$
  select net.http_post(
    url := '<APP_URL>/api/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <CRON_SECRET>'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Check recent runs:
--   select * from cron.job_run_details order by start_time desc limit 5;
--   select * from net._http_response order by created desc limit 5;
