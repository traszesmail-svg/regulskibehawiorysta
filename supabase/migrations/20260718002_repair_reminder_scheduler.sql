-- Repair the production reminder scheduler after the legacy behavior15 job.
-- continued to call a retired application URL. Secrets are deliberately kept
-- in Supabase Vault and must be set outside the migration.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.regulski_read_scheduler_secret(secret_name text)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = secret_name
  order by created_at desc
  limit 1
$$;

create or replace function public.regulski_trigger_reminder_run()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  app_url text;
  cron_secret text;
  request_id bigint;
begin
  app_url := trim(public.regulski_read_scheduler_secret('regulski_app_url'));
  cron_secret := trim(public.regulski_read_scheduler_secret('regulski_cron_secret'));

  if app_url is null or app_url = '' then
    raise exception 'Brak vault secret regulski_app_url';
  end if;

  if cron_secret is null or cron_secret = '' then
    raise exception 'Brak vault secret regulski_cron_secret';
  end if;

  select net.http_post(
    url := rtrim(app_url, '/') || '/api/reminders/run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret
    ),
    body := jsonb_build_object('source', 'supabase_pg_cron'),
    timeout_milliseconds := 10000
  )
  into request_id;

  return request_id;
end;
$$;

create or replace function public.regulski_unschedule_reminder_job()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if exists (select 1 from cron.job where jobname = 'behavior15-booking-reminders') then
    perform cron.unschedule('behavior15-booking-reminders');
  end if;

  if exists (select 1 from cron.job where jobname = 'regulski-booking-reminders') then
    perform cron.unschedule('regulski-booking-reminders');
  end if;
end;
$$;

create or replace function public.regulski_schedule_reminder_job(job_schedule text default '*/5 * * * *')
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  job_id bigint;
begin
  perform public.regulski_unschedule_reminder_job();

  select cron.schedule(
    'regulski-booking-reminders',
    job_schedule,
    $job$select public.regulski_trigger_reminder_run();$job$
  )
  into job_id;

  return job_id;
end;
$$;

select public.regulski_schedule_reminder_job();

revoke all on function public.regulski_read_scheduler_secret(text) from public;
revoke all on function public.regulski_trigger_reminder_run() from public;
revoke all on function public.regulski_unschedule_reminder_job() from public;
revoke all on function public.regulski_schedule_reminder_job(text) from public;
