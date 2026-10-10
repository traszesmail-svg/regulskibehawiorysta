-- Keep enough pg_cron history for incident analysis without allowing the
-- technical run log to dominate this small database.
create or replace function public.regulski_cleanup_cron_history()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, cron, public
as $$
declare
  deleted_rows bigint;
begin
  delete from cron.job_run_details
  where coalesce(end_time, start_time) < now() - interval '14 days';

  get diagnostics deleted_rows = row_count;
  return deleted_rows;
end;
$$;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'regulski-cron-history-retention'
  ) then
    perform cron.unschedule('regulski-cron-history-retention');
  end if;

  perform cron.schedule(
    'regulski-cron-history-retention',
    '17 3 * * *',
    $job$select public.regulski_cleanup_cron_history();$job$
  );
end;
$$;

revoke all on function public.regulski_cleanup_cron_history() from public;
revoke all on function public.regulski_cleanup_cron_history() from anon, authenticated;
grant execute on function public.regulski_cleanup_cron_history() to service_role;
