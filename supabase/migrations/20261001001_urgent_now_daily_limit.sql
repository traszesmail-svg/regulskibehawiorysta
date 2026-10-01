alter table public.urgent_now_requests
  add column if not exists phone text,
  add column if not exists contact_preference text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'urgent_now_requests_contact_preference_check'
      and conrelid = 'public.urgent_now_requests'::regclass
  ) then
    alter table public.urgent_now_requests
      add constraint urgent_now_requests_contact_preference_check
      check (contact_preference is null or contact_preference in ('payment_link', 'notify_only'));
  end if;
end $$;

create or replace function public.create_urgent_now_request(
  p_name text,
  p_email text,
  p_phone text,
  p_contact_preference text,
  p_species text,
  p_topic_id text,
  p_topic_label text,
  p_message text,
  p_requested_date date,
  p_requested_time text
)
returns public.urgent_now_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.urgent_now_requests;
  v_today date := (now() at time zone 'Europe/Warsaw')::date;
begin
  if extract(isodow from v_today) in (6, 7) then
    raise exception using message = 'URGENT_NOW_WEEKEND', errcode = 'P0001';
  end if;
  if p_requested_date <> v_today then
    raise exception using message = 'URGENT_NOW_DATE_CHANGED', errcode = 'P0001';
  end if;
  if p_contact_preference not in ('payment_link', 'notify_only') then
    raise exception using message = 'INVALID_CONTACT_PREFERENCE', errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_today::text));

  if (
    select count(*) from public.urgent_now_requests
    where (created_at at time zone 'Europe/Warsaw')::date = v_today
      and contact_preference = 'payment_link'
  ) >= 2 then
    raise exception using message = 'URGENT_NOW_DAILY_LIMIT', errcode = 'P0001';
  end if;

  insert into public.urgent_now_requests (
    status, name, email, phone, contact_preference, species, topic_id, topic_label,
    message, requested_date, requested_time
  ) values (
    'new', p_name, p_email, p_phone, p_contact_preference, p_species, p_topic_id, p_topic_label,
    p_message, p_requested_date, p_requested_time
  ) returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.create_urgent_now_request(text, text, text, text, text, text, text, text, date, text) from public, anon, authenticated;
grant execute on function public.create_urgent_now_request(text, text, text, text, text, text, text, text, date, text) to service_role;
