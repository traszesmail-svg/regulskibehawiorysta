-- 1. Zapisz aktualny URL aplikacji i ten sam secret, który masz w CRON_SECRET po stronie Vercel.
select vault.create_secret(
  'https://regulskibehawiorysta.pl',
  'regulski_app_url',
  'Publiczny URL aplikacji Regulski Behawiorysta do triggera remindera'
);

select vault.create_secret(
  'wklej-tutaj-cron-secret-z-env',
  'regulski_cron_secret',
  'Bearer secret do /api/reminders/run'
);

-- 2. Aktywuj scheduler co 5 minut po stronie Supabase.
select public.regulski_schedule_reminder_job();

-- 3. Kontrola pomocnicza:
select jobid, jobname, schedule, command
from cron.job
where jobname = 'regulski-booking-reminders';
