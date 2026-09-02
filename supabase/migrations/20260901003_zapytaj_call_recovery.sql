-- Telefoniczny przebieg Zapytaj: dwa podejscia, opozniony zegar i jeden termin odzyskiwania.
alter table public.bookings
  add column if not exists call_attempt integer not null default 0,
  add column if not exists call_answered_at timestamptz,
  add column if not exists call_next_attempt_at timestamptz,
  add column if not exists call_last_error text,
  add column if not exists call_recovery_used boolean not null default false,
  add column if not exists call_recovery_token_hash text,
  add column if not exists call_recovery_expires_at timestamptz;

create index if not exists bookings_call_runner_idx
  on public.bookings (payment_status, consultation_mode, call_status, call_next_attempt_at, booking_date, booking_time);
