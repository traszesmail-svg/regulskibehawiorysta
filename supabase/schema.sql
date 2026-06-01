create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pricing_settings (
  id text primary key,
  consultation_price numeric(10,2) not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  customer_access_token_hash text not null default '',
  owner_name text not null,
  animal_type text not null,
  problem_type text not null,
  pet_age text not null,
  duration_notes text not null,
  description text not null,
  phone text not null,
  email text not null,
  booking_date date not null,
  booking_time text not null,
  slot_id text not null,
  qa_booking boolean not null default false,
  booking_status text not null check (booking_status in ('pending', 'pending_manual_payment', 'confirmed', 'done', 'cancelled', 'expired')),
  payment_status text not null check (payment_status in ('unpaid', 'pending_manual_review', 'paid', 'failed', 'rejected', 'refunded')),
  payment_method text check (payment_method in ('manual', 'payu', 'stripe', 'mock', 'promo')),
  payment_reference text,
  amount numeric(10,2) not null,
  meeting_url text not null,
  checkout_session_id text,
  payment_intent_id text,
  payu_order_id text,
  payu_order_status text,
  customer_phone_normalized text,
  sms_confirmation_status text check (
    sms_confirmation_status in (
      'processing',
      'sent',
      'failed',
      'skipped_missing_phone',
      'skipped_invalid_phone',
      'skipped_not_configured'
    )
  ),
  sms_confirmation_sent_at timestamptz,
  sms_provider_message_id text,
  sms_error_code text,
  sms_error_message text,
  paid_at timestamptz,
  payment_reported_at timestamptz,
  payment_rejected_at timestamptz,
  payment_rejected_reason text,
  cancelled_at timestamptz,
  expired_at timestamptz,
  refunded_at timestamptz,
  recommended_next_step text,
  reminder_sent boolean not null default false,
  prep_video_path text,
  prep_video_filename text,
  prep_video_size_bytes integer,
  prep_link_url text,
  prep_notes text,
  prep_uploaded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (
    event_type in (
      'page_view',
      'view_page',
      'funnel_entry_15_min',
      'funnel_entry_60_min',
      'newsletter_signup',
      'lead_magnet_signup',
      'booking_start',
      'booking_service_selected',
      'booking_slot_selected',
      'booking_form_started',
      'booking_form_submitted',
      'payment_viewed',
      'payment_marked_pending',
      'payment_completed',
      'booking_confirmed',
      'booking_drop',
      'confirmation_viewed',
      'call_room_viewed',
      'contact_form_started',
      'contact_form_submitted',
      'hero_cta_click',
      'service_select',
      'slot_select',
      'form_start',
      'form_submit',
      'payment_start',
      'payment_reported',
      'payment_confirmed',
      'home_view',
      'dogs_page_view',
      'cta_click',
      'topic_selected',
      'slot_selected',
      'form_started',
      'payment_opened',
      'manual_pending',
      'paid',
      'confirmed',
      'reject_cancel',
      'payment_started',
      'payment_success',
      'payment_failed',
      'faq_open',
      'opinion_add',
      'room_entered',
      'quiz_completed',
      'notification_optin_submitted',
      'notification_optout_submitted'
    )
  ),
  booking_id uuid references public.bookings(id) on delete set null,
  qa_booking boolean not null default false,
  source text not null check (source in ('client', 'server')),
  page_path text,
  location text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.availability (
  id text primary key,
  booking_date date not null,
  booking_time text not null,
  is_booked boolean not null default false,
  locked_by_booking_id uuid references public.bookings(id) on delete set null,
  locked_until timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (booking_date, booking_time)
);

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

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_role text not null check (user_role in ('owner', 'customer')),
  booking_id uuid references public.bookings(id) on delete cascade,
  customer_email text,
  target_url text not null,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unsubscribed_at timestamptz,
  check (
    (user_role = 'owner' and booking_id is null)
    or
    (user_role = 'customer' and booking_id is not null)
  )
);

create table if not exists public.urgent_now_requests (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'new' check (status in ('new', 'responded')),
  name text not null,
  email text not null,
  species text not null check (species in ('pies', 'kot')),
  topic_id text not null,
  topic_label text not null,
  message text not null,
  requested_date date not null,
  requested_time text not null,
  responded_at timestamptz,
  proposed_date date,
  proposed_time text,
  response_note text,
  availability_slot_id text references public.availability(id) on delete set null,
  booking_href text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pending_testimonials (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  status text not null default 'pending' check (status in ('pending', 'published', 'skipped')),
  display_name text not null,
  email text not null,
  issue_category text not null,
  opinion text not null,
  photo_url text,
  consent_publish boolean not null default false
);

alter table public.pending_testimonials enable row level security;
revoke all on table public.pending_testimonials from anon, authenticated;
grant all on table public.pending_testimonials to service_role;
drop policy if exists "service role full access" on public.pending_testimonials;
create policy "service role full access" on public.pending_testimonials
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists bookings_status_idx on public.bookings(booking_status, payment_status);
create index if not exists bookings_created_at_idx on public.bookings(created_at desc);
create index if not exists bookings_slot_idx on public.bookings(slot_id);
create index if not exists bookings_qa_booking_idx on public.bookings(qa_booking);
create index if not exists bookings_payment_method_idx on public.bookings(payment_method);
create index if not exists bookings_payu_order_id_idx on public.bookings(payu_order_id);
create index if not exists bookings_sms_confirmation_status_idx on public.bookings(sms_confirmation_status);
create index if not exists bookings_customer_access_hash_idx on public.bookings(customer_access_token_hash);
create index if not exists funnel_events_created_at_idx on public.funnel_events(created_at desc);
create index if not exists funnel_events_event_type_idx on public.funnel_events(event_type);
create index if not exists funnel_events_qa_booking_idx on public.funnel_events(qa_booking);
create index if not exists funnel_events_booking_id_idx on public.funnel_events(booking_id);
create index if not exists availability_date_idx on public.availability(booking_date, booking_time);
create index if not exists availability_booked_idx on public.availability(is_booked);
create index if not exists promo_campaigns_created_at_idx on public.promo_campaigns(created_at desc);
create index if not exists promo_campaigns_status_idx on public.promo_campaigns(status, created_at desc);
create index if not exists promo_codes_campaign_id_idx on public.promo_codes(campaign_id);
create index if not exists promo_codes_status_idx on public.promo_codes(status, expires_at);
create index if not exists promo_redemptions_booking_id_idx on public.promo_redemptions(booking_id);
create index if not exists promo_redemptions_campaign_id_idx on public.promo_redemptions(campaign_id, redeemed_at desc);
create index if not exists push_subscriptions_booking_active_idx
  on public.push_subscriptions(booking_id)
  where unsubscribed_at is null;
create index if not exists push_subscriptions_owner_active_idx
  on public.push_subscriptions(user_role)
  where user_role = 'owner' and unsubscribed_at is null;
create index if not exists urgent_now_requests_created_at_idx on public.urgent_now_requests(created_at desc);
create index if not exists urgent_now_requests_status_idx on public.urgent_now_requests(status, created_at desc);
create index if not exists pending_testimonials_created_at_idx on public.pending_testimonials(created_at desc);
create index if not exists pending_testimonials_status_idx on public.pending_testimonials(status, created_at desc);

alter table public.promo_campaigns enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.push_subscriptions enable row level security;

revoke all on table public.promo_campaigns from anon, authenticated;
revoke all on table public.promo_codes from anon, authenticated;
revoke all on table public.promo_redemptions from anon, authenticated;
revoke all on table public.push_subscriptions from anon, authenticated;

grant all on table public.promo_campaigns to service_role;
grant all on table public.promo_codes to service_role;
grant all on table public.promo_redemptions to service_role;
grant all on table public.push_subscriptions to service_role;

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

drop policy if exists "service role full access push_subscriptions" on public.push_subscriptions;
create policy "service role full access push_subscriptions" on public.push_subscriptions
  for all
  to service_role
  using (true)
  with check (true);

insert into public.pricing_settings (id, consultation_price)
values ('consultation', 39.00)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('booking-prep-materials', 'booking-prep-materials', false)
on conflict (id) do update set public = excluded.public;
