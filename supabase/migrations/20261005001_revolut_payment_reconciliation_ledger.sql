-- A notification is not a bank webhook. This ledger only prevents the same
-- explicitly identified Revolut transaction from being credited twice.
create table if not exists public.revolut_payment_reconciliation_claims (
  notification_fingerprint text primary key check (notification_fingerprint like 'revolut:%'),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.revolut_payment_reconciliation_claims enable row level security;
revoke all on table public.revolut_payment_reconciliation_claims from anon, authenticated;
grant select, insert on table public.revolut_payment_reconciliation_claims to service_role;

create or replace function public.claim_revolut_payment_notification(
  p_fingerprint text,
  p_booking_id uuid,
  p_amount numeric
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if p_fingerprint !~ '^revolut:[0-9a-f]{64}$' then
    raise exception 'Nieprawidłowy odcisk powiadomienia Revolut';
  end if;

  insert into public.revolut_payment_reconciliation_claims (
    notification_fingerprint,
    booking_id,
    amount
  )
  values (p_fingerprint, p_booking_id, p_amount)
  on conflict (notification_fingerprint) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

revoke all on function public.claim_revolut_payment_notification(text, uuid, numeric) from public;
grant execute on function public.claim_revolut_payment_notification(text, uuid, numeric) to service_role;
