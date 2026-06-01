alter table public.bookings
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists payu_order_id text,
  add column if not exists payu_order_status text,
  add column if not exists payment_reported_at timestamptz,
  add column if not exists payment_rejected_at timestamptz,
  add column if not exists payment_rejected_reason text;

update public.bookings
set payment_method = coalesce(
  payment_method,
  case
    when checkout_session_id is not null or payment_intent_id is not null then 'stripe'
    else null
  end
);

alter table public.bookings drop constraint if exists bookings_payment_method_check;

alter table public.bookings
  add constraint bookings_payment_method_check
    check (payment_method in ('manual', 'payu', 'stripe', 'mock', 'promo') or payment_method is null);

create index if not exists bookings_payment_method_idx on public.bookings(payment_method);
create index if not exists bookings_payu_order_id_idx on public.bookings(payu_order_id);

create table if not exists public.promo_campaigns (
  id uuid primary key default gen_random_uuid(),
  clinic_name text not null,
  service_type text not null default 'szybka-konsultacja-15-min',
  code_count integer not null default 5 check (code_count between 1 and 100),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.promo_campaigns(id) on delete cascade,
  code_hash text not null unique,
  code_label text not null,
  service_type text not null default 'szybka-konsultacja-15-min',
  usage_limit integer not null default 1 check (usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  status text not null default 'active' check (status in ('active', 'used', 'revoked', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  used_at timestamptz
);

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.promo_codes(id) on delete restrict,
  campaign_id uuid not null references public.promo_campaigns(id) on delete restrict,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_email text not null,
  service_type text not null,
  redeemed_at timestamptz not null default timezone('utc', now()),
  released_at timestamptz,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists promo_campaigns_created_at_idx on public.promo_campaigns(created_at desc);
create index if not exists promo_campaigns_status_idx on public.promo_campaigns(status, created_at desc);
create index if not exists promo_codes_campaign_id_idx on public.promo_codes(campaign_id);
create index if not exists promo_codes_status_idx on public.promo_codes(status, expires_at);
create index if not exists promo_redemptions_booking_id_idx on public.promo_redemptions(booking_id);
create index if not exists promo_redemptions_campaign_id_idx on public.promo_redemptions(campaign_id, redeemed_at desc);

alter table public.promo_campaigns enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;

revoke all on table public.promo_campaigns from anon, authenticated;
revoke all on table public.promo_codes from anon, authenticated;
revoke all on table public.promo_redemptions from anon, authenticated;

grant all on table public.promo_campaigns to service_role;
grant all on table public.promo_codes to service_role;
grant all on table public.promo_redemptions to service_role;

drop policy if exists "service role full access promo_campaigns" on public.promo_campaigns;
create policy "service role full access promo_campaigns" on public.promo_campaigns
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service role full access promo_codes" on public.promo_codes;
create policy "service role full access promo_codes" on public.promo_codes
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service role full access promo_redemptions" on public.promo_redemptions;
create policy "service role full access promo_redemptions" on public.promo_redemptions
  for all
  to service_role
  using (true)
  with check (true);
