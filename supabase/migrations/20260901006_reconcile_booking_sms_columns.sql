-- Reconcile columns used by the booking and payment notification runtime.
-- The original SMS migration is already recorded remotely, but these columns
-- were absent after a later bookings table rebuild. Every statement is safe to
-- run against an installation that already has the fields.
alter table public.bookings
  add column if not exists customer_phone_normalized text,
  add column if not exists sms_confirmation_status text,
  add column if not exists sms_confirmation_sent_at timestamptz,
  add column if not exists sms_provider_message_id text,
  add column if not exists sms_error_code text,
  add column if not exists sms_error_message text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_sms_confirmation_status_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_sms_confirmation_status_check
      check (
        sms_confirmation_status is null
        or sms_confirmation_status in (
          'processing',
          'sent',
          'failed',
          'skipped_missing_phone',
          'skipped_invalid_phone',
          'skipped_not_configured'
        )
      );
  end if;
end
$$;

update public.bookings
set customer_phone_normalized = case
  when regexp_replace(phone, '\D', '', 'g') ~ '^48\d{9}$' then '+' || regexp_replace(phone, '\D', '', 'g')
  when regexp_replace(phone, '\D', '', 'g') ~ '^\d{9}$' then '+48' || regexp_replace(phone, '\D', '', 'g')
  else customer_phone_normalized
end
where phone is not null
  and customer_phone_normalized is null;

create index if not exists bookings_sms_confirmation_status_idx
  on public.bookings (sms_confirmation_status);
