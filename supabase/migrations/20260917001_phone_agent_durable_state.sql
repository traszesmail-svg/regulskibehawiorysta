-- Durable state for the single Android operator. These rows are never visible
-- to browser clients; only the server service-role uses them.
create table if not exists public.phone_agent_state (
  id text primary key check (id = 'main'),
  last_heartbeat_at timestamptz,
  battery_level integer check (battery_level is null or battery_level between 0 and 100),
  is_charging boolean,
  network text,
  is_default_dialer boolean,
  app_version text,
  last_outage_alert_sent_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.phone_agent_sms_queue (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  phone text not null,
  message text not null check (length(btrim(message)) between 1 and 2000),
  type text not null check (type in ('reminder_60m', 'reminder_15m', 'payment_confirmed', 'custom')),
  status text not null default 'pending' check (status in ('pending', 'claimed', 'sent', 'failed')),
  scheduled_for timestamptz not null default timezone('utc', now()),
  claimed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz,
  error text,
  idempotency_key text not null unique
);

create index if not exists phone_agent_sms_queue_claim_idx
  on public.phone_agent_sms_queue (status, scheduled_for, created_at);

-- SKIP LOCKED means concurrent server instances cannot hand one SMS to two polls.
create or replace function public.claim_next_phone_agent_sms()
returns public.phone_agent_sms_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.phone_agent_sms_queue;
begin
  with candidate as (
    select id
    from public.phone_agent_sms_queue
    where status = 'pending' and scheduled_for <= timezone('utc', now())
    order by scheduled_for asc, created_at asc
    for update skip locked
    limit 1
  )
  update public.phone_agent_sms_queue queue
  set status = 'claimed', claimed_at = timezone('utc', now())
  from candidate
  where queue.id = candidate.id
  returning queue.* into claimed;

  return claimed;
end;
$$;

alter table public.phone_agent_state enable row level security;
alter table public.phone_agent_sms_queue enable row level security;
revoke all on table public.phone_agent_state from anon, authenticated;
revoke all on table public.phone_agent_sms_queue from anon, authenticated;
revoke all on function public.claim_next_phone_agent_sms() from public;
grant select, insert, update, delete on table public.phone_agent_state to service_role;
grant select, insert, update, delete on table public.phone_agent_sms_queue to service_role;
grant execute on function public.claim_next_phone_agent_sms() to service_role;
