-- A Revolut notification may settle at most one product across all payment
-- flows. The triggers preserve the existing booking and commerce RPCs while
-- making both claim ledgers share one atomic fingerprint boundary.
create table if not exists public.revolut_notification_fingerprint_claims (
  notification_fingerprint text primary key
    check (notification_fingerprint ~ '^revolut:[0-9a-f]{64}$'),
  claim_source text not null check (claim_source in ('booking', 'commerce')),
  source_id text not null,
  amount numeric(10,2) not null check (amount > 0),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.revolut_notification_fingerprint_claims enable row level security;
revoke all on table public.revolut_notification_fingerprint_claims from public, anon, authenticated;
grant select, insert on table public.revolut_notification_fingerprint_claims to service_role;

do $$
begin
  if exists (
    select 1
    from public.revolut_payment_reconciliation_claims b
    join public.revolut_commerce_payment_reconciliation_claims c using (notification_fingerprint)
  ) then
    raise exception 'A Revolut fingerprint is already claimed by both booking and commerce flows';
  end if;
end;
$$;

insert into public.revolut_notification_fingerprint_claims (
  notification_fingerprint, claim_source, source_id, amount, created_at
)
select notification_fingerprint, 'booking', booking_id::text, amount, created_at
from public.revolut_payment_reconciliation_claims
on conflict (notification_fingerprint) do nothing;

insert into public.revolut_notification_fingerprint_claims (
  notification_fingerprint, claim_source, source_id, amount, created_at
)
select notification_fingerprint, 'commerce', order_id::text, amount, created_at
from public.revolut_commerce_payment_reconciliation_claims
on conflict (notification_fingerprint) do nothing;

create or replace function public.claim_global_revolut_notification_fingerprint()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source text;
  v_source_id text;
  v_inserted integer;
begin
  if tg_table_name = 'revolut_payment_reconciliation_claims' then
    v_source := 'booking';
    v_source_id := new.booking_id::text;
  elsif tg_table_name = 'revolut_commerce_payment_reconciliation_claims' then
    v_source := 'commerce';
    v_source_id := new.order_id::text;
  else
    raise exception 'Unsupported Revolut claim table: %', tg_table_name;
  end if;

  insert into public.revolut_notification_fingerprint_claims (
    notification_fingerprint, claim_source, source_id, amount, created_at
  ) values (
    new.notification_fingerprint, v_source, v_source_id, new.amount, new.created_at
  )
  on conflict (notification_fingerprint) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    -- Skip the legacy-ledger insert too, so its existing RPC reports a replay.
    return null;
  end if;

  return new;
end;
$$;

revoke all on function public.claim_global_revolut_notification_fingerprint() from public, anon, authenticated;

drop trigger if exists claim_global_revolut_fingerprint_booking
  on public.revolut_payment_reconciliation_claims;
create trigger claim_global_revolut_fingerprint_booking
before insert on public.revolut_payment_reconciliation_claims
for each row execute function public.claim_global_revolut_notification_fingerprint();

drop trigger if exists claim_global_revolut_fingerprint_commerce
  on public.revolut_commerce_payment_reconciliation_claims;
create trigger claim_global_revolut_fingerprint_commerce
before insert on public.revolut_commerce_payment_reconciliation_claims
for each row execute function public.claim_global_revolut_notification_fingerprint();
