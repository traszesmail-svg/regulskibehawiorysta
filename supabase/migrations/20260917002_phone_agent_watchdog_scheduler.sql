-- Free alternative to Vercel Pro cron. The URL and bearer secret already live
-- in Supabase Vault for the existing reminder and call-runner schedulers.
create or replace function public.regulski_trigger_phone_agent_watchdog()
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

  if app_url is null or app_url = '' or cron_secret is null or cron_secret = '' then
    raise exception 'Brak sekretu URL lub CRON_SECRET dla watchdoga telefonu';
  end if;

  select net.http_post(
    url := rtrim(app_url, '/') || '/api/cron/phone-agent-watchdog',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret
    ),
    body := jsonb_build_object('source', 'supabase_pg_cron'),
    timeout_milliseconds := 10000
  ) into request_id;

  return request_id;
end;
$$;

create or replace function public.regulski_unschedule_phone_agent_watchdog()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if exists (select 1 from cron.job where jobname = 'regulski-phone-agent-watchdog') then
    perform cron.unschedule('regulski-phone-agent-watchdog');
  end if;
end;
$$;

create or replace function public.regulski_schedule_phone_agent_watchdog(job_schedule text default '* * * * *')
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  job_id bigint;
begin
  perform public.regulski_unschedule_phone_agent_watchdog();
  select cron.schedule(
    'regulski-phone-agent-watchdog',
    job_schedule,
    $job$select public.regulski_trigger_phone_agent_watchdog();$job$
  ) into job_id;
  return job_id;
end;
$$;

revoke all on function public.regulski_trigger_phone_agent_watchdog() from public;
revoke all on function public.regulski_unschedule_phone_agent_watchdog() from public;
revoke all on function public.regulski_schedule_phone_agent_watchdog(text) from public;
