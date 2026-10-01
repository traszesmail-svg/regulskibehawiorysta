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
  v_nearest_date date;
  v_reserved_count integer := 0;
begin
  if extract(isodow from v_today) in (6, 7) then
    raise exception using message = 'URGENT_NOW_WEEKEND', errcode = 'P0001';
  end if;
  if p_contact_preference not in ('payment_link', 'notify_only') then
    raise exception using message = 'INVALID_CONTACT_PREFERENCE', errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('urgent-now-date:' || p_requested_date::text));
  -- Lock actual slot rows through the requested date so regular booking holds and confirmations serialize with this capacity check.
  perform a.id from public.availability a
    where a.booking_date >= v_today and a.booking_date <= p_requested_date
    order by a.booking_date, a.booking_time for update;

  select min(a.booking_date) into v_nearest_date
    from public.availability a
    where a.booking_date >= v_today
      and (a.booking_date > v_today or a.booking_time > to_char(now() at time zone 'Europe/Warsaw', 'HH24:MI'))
      and a.is_booked = false
      and (a.locked_until is null or a.locked_until <= now())
      and (a.locked_by_booking_id is null or a.locked_until <= now())
      and a.id not like 'zapytaj-live-%';
  if v_nearest_date is null or p_requested_date <> v_nearest_date then
    raise exception using message = 'URGENT_NOW_DATE_CHANGED', errcode = 'P0001';
  end if;

  if p_contact_preference = 'payment_link' then
    select count(distinct b.id) into v_reserved_count
      from public.bookings b
      where b.booking_date = p_requested_date
        and (
          b.booking_status in ('confirmed', 'done')
          or (
            b.booking_status in ('pending', 'pending_manual_payment')
            and exists (
              select 1 from public.availability a
              where a.locked_by_booking_id = b.id
                and a.locked_until > now()
            )
          )
        );

    v_reserved_count := v_reserved_count + (
      select count(*) from public.urgent_now_requests r
      where r.requested_date = p_requested_date and r.contact_preference = 'payment_link'
    );
    if v_reserved_count >= 2 then
      raise exception using message = 'URGENT_NOW_DAILY_LIMIT', errcode = 'P0001';
    end if;
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
