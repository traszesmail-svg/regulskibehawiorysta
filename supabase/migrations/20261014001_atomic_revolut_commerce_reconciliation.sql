-- A phone notification is never a payment webhook. It can only credit one
-- explicitly matched ecommerce order, once, with a unique Revolut fingerprint.
create table if not exists public.revolut_commerce_payment_reconciliation_claims (
  notification_fingerprint text primary key check (notification_fingerprint like 'revolut:%'),
  order_id uuid not null unique references public.lead_bookings(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.revolut_commerce_payment_reconciliation_claims enable row level security;
revoke all on table public.revolut_commerce_payment_reconciliation_claims from public, anon, authenticated;
grant select, insert on table public.revolut_commerce_payment_reconciliation_claims to service_role;

create or replace function public.reconcile_revolut_commerce_payment_notification(
  p_fingerprint text,
  p_order_number text,
  p_amount numeric,
  p_access_code text
)
returns setof public.lead_bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.lead_bookings%rowtype;
  v_meta jsonb;
  v_claimed_order_id uuid;
  v_access_code text;
  v_now timestamptz := timezone('utc', now());
begin
  if p_fingerprint is null or p_fingerprint !~ '^revolut:[0-9a-f]{64}$' then
    raise exception 'Invalid Revolut notification fingerprint';
  end if;

  if p_order_number is null or trim(p_order_number) = ''
     or p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2)
     or p_access_code is null or p_access_code !~ '^KOD-[0-9A-F]{4}-[0-9A-F]{2}$' then
    return;
  end if;

  -- The row lock serializes competing transaction IDs for the same order.
  select * into v_order
  from public.lead_bookings
  where upper(preferred_slots) = upper(trim(p_order_number))
  for update;

  if not found or v_order.admin_notes is null or trim(v_order.admin_notes) = '' then
    return;
  end if;

  begin
    v_meta := v_order.admin_notes::jsonb;
  exception when others then
    return;
  end;

  if v_meta->>'manualAmount' is null then
    return;
  end if;

  -- Never accept a name or stale paid order as evidence. The caller may match
  -- by amount only when exactly one pending ebook order is eligible; this RPC
  -- independently rechecks that the pending order's manual amount is exact.
  if coalesce(v_meta->>'commerce', 'false') <> 'true'
     or coalesce(v_meta->>'productType', '') <> 'ebook'
     or coalesce(v_meta->>'status', '') not in ('created', 'waiting_manual_payment', 'payment_reported')
     or nullif(v_meta->>'providerPaymentId', '') is not null then
    return;
  end if;

  begin
    if (v_meta->>'manualAmount')::numeric <> p_amount then
      return;
    end if;
  exception when others then
    return;
  end;

  -- A fingerprint cannot be replayed, and two fingerprints cannot credit one order.
  insert into public.revolut_commerce_payment_reconciliation_claims (
    notification_fingerprint,
    order_id,
    amount
  ) values (
    p_fingerprint,
    v_order.id,
    p_amount
  )
  on conflict do nothing
  returning order_id into v_claimed_order_id;

  if v_claimed_order_id is null then
    return;
  end if;

  v_access_code := p_access_code;

  v_meta := jsonb_set(v_meta, '{status}', to_jsonb('access_sent'::text));
  v_meta := jsonb_set(v_meta, '{providerPaymentId}', to_jsonb(p_fingerprint));
  v_meta := jsonb_set(v_meta, '{paidAt}', to_jsonb(v_now::text));
  v_meta := jsonb_set(v_meta, '{accessSentAt}', to_jsonb(v_now::text));
  v_meta := jsonb_set(v_meta, '{accessCodeStatus}', to_jsonb('active'::text));
  v_meta := jsonb_set(v_meta, '{accessCodeUsageCount}', to_jsonb(0));
  v_meta := jsonb_set(v_meta, '{accessCodeUsageLimit}', to_jsonb(coalesce((v_meta->>'accessCodeUsageLimit')::integer, 3)));
  v_meta := jsonb_set(v_meta, '{accessCodeExpiresAt}', to_jsonb((v_now + interval '72 hours')::text));

  update public.lead_bookings
  set
    status = 'paid',
    payment_method = 'blik_phone',
    paid_at = v_now,
    calendar_url = 'commerce-code:' || v_access_code,
    admin_notes = v_meta::text,
    updated_at = v_now
  where id = v_order.id
  returning * into v_order;

  return next v_order;
end;
$$;

revoke all on function public.reconcile_revolut_commerce_payment_notification(text, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.reconcile_revolut_commerce_payment_notification(text, text, numeric, text)
  to service_role;
