-- Caller classification decision audit log.

create table if not exists public.caller_classification_audits (
  id uuid primary key default gen_random_uuid(),
  decision text not null check (decision in (
    'eligible_callback',
    'session_in_progress',
    'paid_booking_no_session',
    'unpaid_booking',
    'unknown_number',
    'session_completed',
    'callback_window_expired',
    'ambiguous_match',
    'invalid_phone',
    'missing_secret',
    'store_error',
    'audit_error',
    'idempotency_conflict'
  )),
  allow_call boolean not null default false,
  reason text not null,
  caller_phone_fingerprint text,
  caller_phone_masked text,
  booking_id uuid references public.bookings(id) on delete set null,
  session_id uuid references public.call_sessions(id) on delete set null,
  remaining_seconds integer check (remaining_seconds is null or remaining_seconds >= 0),
  resume_window_expires_at timestamptz,
  idempotency_key text unique check (idempotency_key is null or (length(trim(idempotency_key)) > 0 and length(idempotency_key) <= 128)),
  request_hash text check (request_hash is null or length(request_hash) >= 16),
  payload_hash text check (payload_hash is null or length(payload_hash) >= 16),
  evaluated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists caller_classification_audits_fingerprint_idx
  on public.caller_classification_audits (caller_phone_fingerprint, created_at desc);

create index if not exists caller_classification_audits_idempotency_key_idx
  on public.caller_classification_audits (idempotency_key);

create index if not exists caller_classification_audits_created_at_idx
  on public.caller_classification_audits (created_at desc);

alter table public.caller_classification_audits enable row level security;
revoke all on table public.caller_classification_audits from anon, authenticated;
grant select, insert on table public.caller_classification_audits to service_role;
