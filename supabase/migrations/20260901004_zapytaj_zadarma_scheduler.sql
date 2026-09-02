-- Minutowy runner rozmow telefonicznych. Nie tworzy polaczen bez oplaconego
-- bookingu z kanalem phone; dane autoryzacyjne pozostaja w Supabase Vault.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.regulski_trigger_zadarma_run()
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
    return null;
  end if;

  select net.http_post(
    url := rtrim(app_url, '/') || '/api/zadarma/cron',
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

create or replace function public.regulski_unschedule_zadarma_job()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if exists (select 1 from cron.job where jobname = 'regulski-zadarma-call-runner') then
    perform cron.unschedule('regulski-zadarma-call-runner');
  end if;
end;
$$;

create or replace function public.regulski_schedule_zadarma_job(job_schedule text default '* * * * *')
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  job_id bigint;
begin
  perform public.regulski_unschedule_zadarma_job();

  select cron.schedule(
    'regulski-zadarma-call-runner',
    job_schedule,
    $job$select public.regulski_trigger_zadarma_run();$job$
  )
  into job_id;

  return job_id;
end;
$$;

select public.regulski_schedule_zadarma_job();

revoke all on function public.regulski_trigger_zadarma_run() from public;
revoke all on function public.regulski_unschedule_zadarma_job() from public;
revoke all on function public.regulski_schedule_zadarma_job(text) from public;
