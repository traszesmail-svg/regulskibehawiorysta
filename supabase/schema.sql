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
  service_type text not null default 'szybka-konsultacja-15-min',
  live_mode boolean not null default false,
  booking_status text not null check (booking_status in ('pending', 'pending_manual_payment', 'confirmed', 'done', 'cancelled', 'expired')),
  payment_status text not null check (payment_status in ('unpaid', 'pending_manual_review', 'paid', 'failed', 'rejected', 'refunded')),
  payment_method text check (payment_method in ('manual', 'payu', 'stripe', 'mock', 'promo')),
  payment_reference text,
  consultation_mode text check (consultation_mode in ('phone', 'jitsi')) ,
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
  recommended_material_slug text,
  reminder_sent boolean not null default false,
  prep_video_path text,
  prep_video_filename text,
  prep_video_size_bytes integer,
  prep_link_url text,
  prep_notes text,
  prep_uploaded_at timestamptz,
  call_id text,
  call_status text,
  started_at timestamptz,
  call_attempt integer not null default 0,
  call_answered_at timestamptz,
  call_next_attempt_at timestamptz,
  call_last_error text,
  call_recovery_used boolean not null default false,
  call_recovery_token_hash text,
  call_recovery_expires_at timestamptz,
  questions_remaining integer,
  questions_expires_at timestamptz,
  consultation_access_code_hash text,
  consultation_access_expires_at timestamptz,
  consultation_access_used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lead_bookings (
  id uuid primary key default gen_random_uuid(),
  access_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'pending',
  service text not null,
  service_label text not null,
  service_price text not null,
  name text not null,
  email text not null,
  species text not null,
  description text not null,
  preferred_slots text not null default '',
  confirmed_date text,
  confirmed_time text,
  payment_link text,
  payment_method text,
  paid_at timestamptz,
  call_room_url text,
  calendar_url text,
  admin_notes text,
  call_id text,
  call_status text,
  started_at timestamptz,
  questions_remaining integer,
  questions_expires_at timestamptz
);

create index if not exists lead_bookings_questions_expires_idx
  on public.lead_bookings (questions_expires_at)
  where questions_expires_at is not null;

alter table public.lead_bookings enable row level security;

drop policy if exists "Service role full access" on public.lead_bookings;
create policy "Service role full access" on public.lead_bookings
  for all using (true) with check (true);

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

create table if not exists public.zapytaj_live_status (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.zapytaj_live_status enable row level security;
revoke all on table public.zapytaj_live_status from anon, authenticated;
grant select, insert, update, delete on table public.zapytaj_live_status to service_role;

create table if not exists public.revolut_payment_reconciliation_claims (
  notification_fingerprint text primary key check (notification_fingerprint like 'revolut:%'),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  created_at timestamptz not null default timezone('utc', now())
);

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

  insert into public.revolut_payment_reconciliation_claims (notification_fingerprint, booking_id, amount)
  values (p_fingerprint, p_booking_id, p_amount)
  on conflict (notification_fingerprint) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

alter table public.revolut_payment_reconciliation_claims enable row level security;
revoke all on table public.revolut_payment_reconciliation_claims from anon, authenticated;
grant select, insert on table public.revolut_payment_reconciliation_claims to service_role;
revoke all on function public.claim_revolut_payment_notification(text, uuid, numeric) from public;
revoke all on function public.claim_revolut_payment_notification(text, uuid, numeric) from anon, authenticated;
grant execute on function public.claim_revolut_payment_notification(text, uuid, numeric) to service_role;

create or replace function public.reconcile_revolut_payment_notification(
  p_fingerprint text,
  p_booking_id uuid,
  p_amount numeric
)
returns setof public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_claimed_fingerprint text;
  v_now timestamptz := timezone('utc', now());
begin
  if p_fingerprint !~ '^revolut:[0-9a-f]{64}$' then
    raise exception 'Invalid Revolut notification fingerprint';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'Invalid Revolut payment amount';
  end if;

  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if not found
    or v_booking.amount <> p_amount
    or v_booking.sms_confirmation_status is not null
    or not (
      (v_booking.booking_status = 'pending' and v_booking.payment_status = 'unpaid')
      or (
        v_booking.booking_status = 'pending_manual_payment'
        and v_booking.payment_status = 'pending_manual_review'
      )
    ) then
    return;
  end if;

  insert into public.revolut_payment_reconciliation_claims (
    notification_fingerprint,
    booking_id,
    amount
  )
  values (p_fingerprint, p_booking_id, p_amount)
  on conflict (notification_fingerprint) do nothing
  returning notification_fingerprint into v_claimed_fingerprint;

  if v_claimed_fingerprint is null then
    return;
  end if;

  update public.bookings b
  set
    booking_status = 'confirmed',
    payment_status = 'paid',
    payment_method = 'manual',
    payment_reference = p_fingerprint,
    paid_at = v_now,
    cancelled_at = null,
    expired_at = null,
    payment_rejected_at = null,
    payment_rejected_reason = null,
    sms_confirmation_status = 'processing',
    sms_confirmation_sent_at = null,
    sms_provider_message_id = null,
    sms_error_code = null,
    sms_error_message = null,
    updated_at = v_now
  where b.id = p_booking_id
    and b.amount = p_amount
    and b.sms_confirmation_status is null
    and (
      (b.booking_status = 'pending' and b.payment_status = 'unpaid')
      or (
        b.booking_status = 'pending_manual_payment'
        and b.payment_status = 'pending_manual_review'
      )
    )
  returning b.* into v_booking;

  if not found then
    delete from public.revolut_payment_reconciliation_claims
    where notification_fingerprint = p_fingerprint
      and booking_id = p_booking_id
      and amount = p_amount;
    return;
  end if;

  update public.availability
  set
    is_booked = true,
    locked_by_booking_id = p_booking_id,
    locked_until = null,
    updated_at = v_now
  where locked_by_booking_id = p_booking_id;

  return next v_booking;
end;
$$;

revoke all on function public.reconcile_revolut_payment_notification(text, uuid, numeric) from public;
revoke all on function public.reconcile_revolut_payment_notification(text, uuid, numeric) from anon, authenticated;
grant execute on function public.reconcile_revolut_payment_notification(text, uuid, numeric) to service_role;

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
      'notification_optout_submitted',
      'case_map_started',
      'case_map_completed',
      'case_map_offer_viewed',
      'case_map_service_clicked',
      'case_map_booking_started'
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

create table if not exists public.growth_signups (
  id text primary key,
  email text not null,
  kind text not null check (kind in ('newsletter', 'lead_magnet')),
  lead_magnet_slug text,
  location text,
  source_page text,
  segment text,
  created_at timestamptz not null default timezone('utc', now()),
  welcome_sent_at timestamptz,
  followup_three_sent_at timestamptz,
  followup_seven_sent_at timestamptz,
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,
  marketing_unsubscribed_at timestamptz,
  unsubscribe_token text
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
  logo_src text,
  service_type text not null default 'szybka-konsultacja-15-min',
  code_count integer not null default 5 check (code_count between 1 and 100),
  campaign_kind text not null default 'clinic' check (campaign_kind in ('clinic', 'community')),
  promotion_price numeric(10,2) not null default 0 check (
    (campaign_kind = 'clinic' and promotion_price = 0)
    or (campaign_kind = 'community' and promotion_price = 39.99)
  ),
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
  campaign_kind text not null default 'clinic' check (campaign_kind in ('clinic', 'community')),
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

create table if not exists public.zapytaj_live_notifications (
  id uuid primary key default gen_random_uuid(),
  notification_key text not null unique,
  phone text,
  email text,
  channel text not null check (channel in ('sms', 'email')),
  source_page text,
  status text not null default 'subscribed' check (status in ('subscribed', 'notified', 'unsubscribed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  notified_at timestamptz,
  check (
    (channel = 'sms' and phone is not null)
    or
    (channel = 'email' and email is not null)
  )
);

create table if not exists public.urgent_now_requests (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'new' check (status in ('new', 'responded')),
  name text not null,
  email text not null,
  phone text,
  contact_preference text check (contact_preference is null or contact_preference in ('payment_link', 'notify_only')),
  species text check (species in ('pies', 'kot')),
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
  no_response_sms_status text,
  no_response_sms_sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.create_urgent_now_request(
  p_name text, p_email text, p_phone text, p_contact_preference text,
  p_species text, p_topic_id text, p_topic_label text, p_message text,
  p_requested_date date, p_requested_time text
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
  if p_species is null then
    if p_requested_date not in (v_today, v_today + 1) then
      raise exception using message = 'URGENT_NOW_PREFERENCE_INVALID_DATE', errcode = '22023';
    end if;
    if p_requested_time !~ '^((0[8-9]|1[0-9]):(00|30)|20:00)$' then
      raise exception using message = 'URGENT_NOW_PREFERENCE_INVALID_TIME', errcode = '22023';
    end if;
    if p_requested_date = v_today and p_requested_time < to_char(now() at time zone 'Europe/Warsaw', 'HH24:MI') then
      raise exception using message = 'URGENT_NOW_PREFERENCE_PAST_TIME', errcode = '22023';
    end if;
  else
    perform a.id from public.availability a
      where a.booking_date >= v_today and a.booking_date <= p_requested_date
      order by a.booking_date, a.booking_time for update;
    if p_requested_date <> v_today then
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
    elsif p_requested_time <> '00:00' then
      raise exception using message = 'INVALID_TODAY_REQUEST_TIME', errcode = '22023';
    end if;
  end if;
  if p_contact_preference = 'payment_link' then
    select count(distinct b.id) into v_reserved_count from public.bookings b
      where b.booking_date = p_requested_date and (
        b.booking_status in ('confirmed', 'done') or (
          b.booking_status in ('pending', 'pending_manual_payment') and exists (
            select 1 from public.availability a where a.locked_by_booking_id = b.id and a.locked_until > now()
          )
        )
      );
    v_reserved_count := v_reserved_count + (
      select count(*) from public.urgent_now_requests r where r.requested_date = p_requested_date and r.contact_preference = 'payment_link'
    );
    if v_reserved_count >= 2 then
      raise exception using message = 'URGENT_NOW_DAILY_LIMIT', errcode = 'P0001';
    end if;
  end if;
  insert into public.urgent_now_requests (status, name, email, phone, contact_preference, species, topic_id, topic_label, message, requested_date, requested_time)
  values ('new', p_name, p_email, p_phone, p_contact_preference, p_species, p_topic_id, p_topic_label, p_message, p_requested_date, p_requested_time)
  returning * into v_request;
  return v_request;
end;
$$;

revoke all on function public.create_urgent_now_request(text, text, text, text, text, text, text, text, date, text) from public, anon, authenticated;
grant execute on function public.create_urgent_now_request(text, text, text, text, text, text, text, text, date, text) to service_role;

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
create unique index if not exists growth_signups_unsubscribe_token_idx
  on public.growth_signups(unsubscribe_token)
  where unsubscribe_token is not null;
create index if not exists growth_signups_followup_queue_idx
  on public.growth_signups(kind, marketing_opt_in, marketing_unsubscribed_at, created_at);
create index if not exists availability_booked_idx on public.availability(is_booked);
create index if not exists promo_campaigns_created_at_idx on public.promo_campaigns(created_at desc);
create index if not exists promo_campaigns_status_idx on public.promo_campaigns(status, created_at desc);
create index if not exists promo_codes_campaign_id_idx on public.promo_codes(campaign_id);
create index if not exists promo_codes_status_idx on public.promo_codes(status, expires_at);
create index if not exists promo_redemptions_booking_id_idx on public.promo_redemptions(booking_id);
create index if not exists promo_redemptions_campaign_id_idx on public.promo_redemptions(campaign_id, redeemed_at desc);
create unique index if not exists promo_redemptions_community_campaign_email_active_idx
  on public.promo_redemptions(campaign_id, lower(customer_email))
  where campaign_kind = 'community' and released_at is null;
create index if not exists push_subscriptions_booking_active_idx
  on public.push_subscriptions(booking_id)
  where unsubscribed_at is null;
create index if not exists push_subscriptions_owner_active_idx
  on public.push_subscriptions(user_role)
  where user_role = 'owner' and unsubscribed_at is null;
create index if not exists zapytaj_live_notifications_status_idx
  on public.zapytaj_live_notifications(status, created_at);
create index if not exists urgent_now_requests_created_at_idx on public.urgent_now_requests(created_at desc);
create index if not exists urgent_now_requests_status_idx on public.urgent_now_requests(status, created_at desc);
create index if not exists pending_testimonials_created_at_idx on public.pending_testimonials(created_at desc);
create index if not exists pending_testimonials_status_idx on public.pending_testimonials(status, created_at desc);

alter table public.promo_campaigns enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.zapytaj_live_notifications enable row level security;
alter table public.growth_signups enable row level security;

revoke all on table public.promo_campaigns from anon, authenticated;
revoke all on table public.promo_codes from anon, authenticated;
revoke all on table public.promo_redemptions from anon, authenticated;
revoke all on table public.push_subscriptions from anon, authenticated;
revoke all on table public.zapytaj_live_notifications from anon, authenticated;
revoke all on table public.growth_signups from anon, authenticated;

grant all on table public.promo_campaigns to service_role;
grant all on table public.promo_codes to service_role;
grant all on table public.promo_redemptions to service_role;
grant all on table public.push_subscriptions to service_role;
grant all on table public.zapytaj_live_notifications to service_role;
grant all on table public.growth_signups to service_role;

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

drop policy if exists "service role full access growth_signups" on public.growth_signups;
create policy "service role full access growth_signups" on public.growth_signups
  for all
  to service_role
  using (true)
  with check (true);

insert into public.pricing_settings (id, consultation_price)
values ('consultation', 79.00)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('booking-prep-materials', 'booking-prep-materials', false)
on conflict (id) do update set public = excluded.public;


create table if not exists public.case_maps (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  schema_version text not null,
  status text not null default 'draft' check (status in ('draft', 'completed', 'archived')),
  species text not null check (species in ('pies', 'kot')),
  topic text not null,
  path text not null check (path in ('fast', 'long')),
  source text not null default 'direct' check (source in ('direct', 'problem_page', 'instagram')),
  problem_key text,
  triage_state text not null check (
    triage_state in (
      'SAFETY_NOW',
      'HUMAN_MEDICAL',
      'VET_URGENT',
      'VET_FIRST',
      'SAFETY_PRIORITY',
      'PROCEED'
    )
  ),
  answers jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  current_question_id text,
  consent_version text not null,
  consented_at timestamptz not null,
  marketing_consent boolean not null default false,
  revision integer not null default 1 check (revision > 0),
  completed_at timestamptz,
  booking_id uuid references public.bookings(id) on delete set null,
  shared_with_consultant_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists case_maps_owner_updated_idx
  on public.case_maps(owner_user_id, updated_at desc);

create index if not exists case_maps_status_updated_idx
  on public.case_maps(status, updated_at desc);

create index if not exists case_maps_booking_idx
  on public.case_maps(booking_id);

create index if not exists case_maps_shared_review_idx
  on public.case_maps(shared_with_consultant_at desc)
  where shared_with_consultant_at is not null;

alter table public.case_maps enable row level security;
revoke all on table public.case_maps from anon, authenticated;
grant all on table public.case_maps to service_role;

drop policy if exists "service role full access case_maps" on public.case_maps;
create policy "service role full access case_maps" on public.case_maps
  for all
  to service_role
  using (true);

create table if not exists public.case_map_profile_claims (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  email_hash text not null,
  claim_token_hash text not null,
  snapshot jsonb not null,
  consent_version text not null,
  consented_at timestamptz not null,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  claimed_case_map_id uuid references public.case_maps(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists case_map_profile_claims_email_expires_idx
  on public.case_map_profile_claims(email_hash, expires_at);

create unique index if not exists case_map_profile_claims_token_idx
  on public.case_map_profile_claims(claim_token_hash);

create index if not exists case_map_profile_claims_expires_idx
  on public.case_map_profile_claims(expires_at);

alter table public.case_map_profile_claims enable row level security;
revoke all on table public.case_map_profile_claims from anon, authenticated;
grant all on table public.case_map_profile_claims to service_role;

drop policy if exists "service role full access case_map_profile_claims" on public.case_map_profile_claims;
create policy "service role full access case_map_profile_claims" on public.case_map_profile_claims
  for all
  to service_role
  using (true);

create or replace function public.regulski_delete_expired_case_map_profile_claims()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  deleted_count integer;
begin
  delete from public.case_map_profile_claims
  where expires_at <= now();

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.regulski_delete_expired_case_map_profile_claims() from public;

-- Durable call sessions and idempotent event audit for consultation calls.
create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  caller_phone_fingerprint text not null,
  caller_phone_masked text not null,
  limit_seconds integer not null default 900 check (limit_seconds > 0),
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0 and elapsed_seconds <= limit_seconds),
  remaining_seconds integer not null default 900 check (remaining_seconds >= 0 and remaining_seconds <= limit_seconds),
  answered_at timestamptz,
  interrupted_at timestamptz,
  resume_window_expires_at timestamptz,
  state text not null default 'active' check (state in ('active', 'interrupted', 'waiting_for_owner', 'bridging', 'resumed', 'completed', 'failed')),
  version integer not null default 1 check (version >= 1),
  idempotency_key text unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (elapsed_seconds + remaining_seconds = limit_seconds)
);

create index if not exists call_sessions_booking_id_idx
  on public.call_sessions (booking_id);

create index if not exists call_sessions_fingerprint_state_idx
  on public.call_sessions (caller_phone_fingerprint, state);

create table if not exists public.call_session_events (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid not null references public.call_sessions(id) on delete cascade,
  event_type text not null,
  from_state text check (from_state is null or from_state in ('active', 'interrupted', 'waiting_for_owner', 'bridging', 'resumed', 'completed', 'failed')),
  to_state text not null check (to_state in ('active', 'interrupted', 'waiting_for_owner', 'bridging', 'resumed', 'completed', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  payload_hash text not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists call_session_events_session_idx
  on public.call_session_events (call_session_id, created_at asc);

-- Atomic creation of a call session with idempotency check
create or replace function public.create_call_session(
  p_session_id uuid,
  p_booking_id uuid,
  p_caller_phone_fingerprint text,
  p_caller_phone_masked text,
  p_limit_seconds integer,
  p_answered_at timestamptz,
  p_idempotency_key text,
  p_payload jsonb,
  p_payload_hash text
)
returns public.call_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.call_sessions%rowtype;
  v_existing_event public.call_session_events%rowtype;
  v_limit integer := coalesce(p_limit_seconds, 900);
  v_answered timestamptz := coalesce(p_answered_at, timezone('utc', now()));
  v_new_id uuid := coalesce(p_session_id, gen_random_uuid());
begin
  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtext('call_session_idempotency:' || p_idempotency_key));

    select * into v_existing_event
    from public.call_session_events
    where idempotency_key = p_idempotency_key;

    if found then
      if p_payload_hash is not null and v_existing_event.payload_hash <> p_payload_hash then
        raise exception 'IDEMPOTENCY_CONFLICT: Key % already exists with different payload', p_idempotency_key;
      end if;
      select * into v_session from public.call_sessions where id = v_existing_event.call_session_id;
      return v_session;
    end if;
  end if;

  insert into public.call_sessions (
    id,
    booking_id,
    caller_phone_fingerprint,
    caller_phone_masked,
    limit_seconds,
    elapsed_seconds,
    remaining_seconds,
    answered_at,
    interrupted_at,
    resume_window_expires_at,
    state,
    version,
    idempotency_key,
    created_at,
    updated_at
  ) values (
    v_new_id,
    p_booking_id,
    p_caller_phone_fingerprint,
    p_caller_phone_masked,
    v_limit,
    0,
    v_limit,
    v_answered,
    null,
    null,
    'active',
    1,
    p_idempotency_key,
    timezone('utc', now()),
    timezone('utc', now())
  )
  returning * into v_session;

  if p_idempotency_key is not null then
    insert into public.call_session_events (
      call_session_id,
      event_type,
      from_state,
      to_state,
      payload,
      payload_hash,
      idempotency_key
    ) values (
      v_session.id,
      'session_started',
      null,
      'active',
      coalesce(p_payload, '{}'::jsonb),
      coalesce(p_payload_hash, ''),
      p_idempotency_key
    );
  end if;

  return v_session;
end;
$$;

-- Atomic transition and time accounting with row lock, CAS version check and idempotent audit
create or replace function public.transition_call_session(
  p_session_id uuid,
  p_target_state text,
  p_expected_version integer,
  p_delta_seconds integer default 0,
  p_event_type text default null,
  p_idempotency_key text default null,
  p_payload jsonb default '{}'::jsonb,
  p_payload_hash text default null,
  p_interrupted_at timestamptz default null,
  p_resume_window_expires_at timestamptz default null,
  p_answered_at timestamptz default null
)
returns public.call_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.call_sessions%rowtype;
  v_existing_event public.call_session_events%rowtype;
  v_old_state text;
  v_new_elapsed integer;
  v_new_remaining integer;
  v_interrupted_at timestamptz;
  v_resume_window_expires_at timestamptz;
  v_answered_at timestamptz;
  v_now timestamptz := timezone('utc', now());
  v_final_target_state text := p_target_state;
begin
  -- 1. Idempotency check with advisory lock before session row lock
  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtext('call_session_idempotency:' || p_idempotency_key));

    select * into v_existing_event
    from public.call_session_events
    where idempotency_key = p_idempotency_key;

    if found then
      if p_payload_hash is not null and v_existing_event.payload_hash <> p_payload_hash then
        raise exception 'IDEMPOTENCY_CONFLICT: Key % already exists with different payload', p_idempotency_key;
      end if;
      if v_existing_event.call_session_id <> p_session_id then
        raise exception 'IDEMPOTENCY_CONFLICT: Key % was used for a different session', p_idempotency_key;
      end if;
      select * into v_session from public.call_sessions where id = p_session_id;
      return v_session;
    end if;
  end if;

  -- 2. Lock the session row
  select * into v_session
  from public.call_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND: Call session % not found', p_session_id;
  end if;

  -- 3. Terminal state check
  if v_session.state in ('completed', 'failed') then
    raise exception 'TERMINAL_STATE: Cannot transition from terminal state %', v_session.state;
  end if;

  -- 4. CAS / Concurrency check
  if p_expected_version is not null and v_session.version <> p_expected_version then
    raise exception 'CONCURRENCY_CONFLICT: Expected version % but session is at version %', p_expected_version, v_session.version;
  end if;

  v_old_state := v_session.state;

  -- 5. Strict transition validation
  if v_old_state = 'active' and v_final_target_state not in ('interrupted', 'completed', 'failed', 'active') then
    raise exception 'ILLEGAL_TRANSITION: Cannot transition from active to %', v_final_target_state;
  elsif v_old_state = 'interrupted' and v_final_target_state not in ('waiting_for_owner', 'completed', 'failed') then
    raise exception 'ILLEGAL_TRANSITION: Cannot transition from interrupted to %', v_final_target_state;
  elsif v_old_state = 'waiting_for_owner' and v_final_target_state not in ('bridging', 'interrupted', 'failed') then
    raise exception 'ILLEGAL_TRANSITION: Cannot transition from waiting_for_owner to %', v_final_target_state;
  elsif v_old_state = 'bridging' and v_final_target_state not in ('resumed', 'interrupted', 'failed') then
    raise exception 'ILLEGAL_TRANSITION: Cannot transition from bridging to %', v_final_target_state;
  elsif v_old_state = 'resumed' and v_final_target_state not in ('interrupted', 'completed', 'failed', 'resumed') then
    raise exception 'ILLEGAL_TRANSITION: Cannot transition from resumed to %', v_final_target_state;
  end if;

  -- 6. Check resume window expiration on callback from interrupted
  if v_old_state = 'interrupted' and v_final_target_state = 'waiting_for_owner' then
    if v_session.resume_window_expires_at is not null and v_now > v_session.resume_window_expires_at then
      raise exception 'RESUME_WINDOW_EXPIRED: Callback window expired at %', v_session.resume_window_expires_at;
    end if;
  end if;

  -- 7. Time accounting
  if coalesce(p_delta_seconds, 0) < 0 then
    raise exception 'INVALID_TIME: Delta seconds cannot be negative';
  end if;

  -- Positive delta is allowed ONLY when old state is active or resumed
  if coalesce(p_delta_seconds, 0) > 0 and v_old_state not in ('active', 'resumed') then
    raise exception 'INVALID_TIME: Positive delta is only allowed from active or resumed state (current: %)', v_old_state;
  end if;

  v_new_elapsed := v_session.elapsed_seconds + coalesce(p_delta_seconds, 0);
  if v_new_elapsed > v_session.limit_seconds then
    v_new_elapsed := v_session.limit_seconds;
  end if;
  v_new_remaining := v_session.limit_seconds - v_new_elapsed;

  -- If time is exhausted, transition to completed
  if v_new_remaining = 0 and v_final_target_state not in ('completed', 'failed') then
    v_final_target_state := 'completed';
  end if;

  -- 8. Dates and windows
  v_interrupted_at := v_session.interrupted_at;
  v_resume_window_expires_at := v_session.resume_window_expires_at;
  v_answered_at := coalesce(p_answered_at, v_session.answered_at);

  if v_final_target_state = 'interrupted' then
    v_interrupted_at := coalesce(p_interrupted_at, v_now);
    v_resume_window_expires_at := coalesce(p_resume_window_expires_at, v_interrupted_at + interval '15 minutes');
  elsif v_final_target_state in ('completed', 'failed') then
    v_resume_window_expires_at := null;
  elsif v_final_target_state = 'resumed' then
    v_interrupted_at := null;
    v_resume_window_expires_at := null;
  end if;

  -- 9. Update the session row
  update public.call_sessions
  set
    state = v_final_target_state,
    elapsed_seconds = v_new_elapsed,
    remaining_seconds = v_new_remaining,
    answered_at = v_answered_at,
    interrupted_at = v_interrupted_at,
    resume_window_expires_at = v_resume_window_expires_at,
    version = v_session.version + 1,
    updated_at = v_now
  where id = p_session_id
  returning * into v_session;

  -- 10. Audit event insert
  if p_idempotency_key is not null then
    insert into public.call_session_events (
      call_session_id,
      event_type,
      from_state,
      to_state,
      payload,
      payload_hash,
      idempotency_key
    ) values (
      v_session.id,
      coalesce(p_event_type, 'state_transition'),
      v_old_state,
      v_final_target_state,
      coalesce(p_payload, '{}'::jsonb),
      coalesce(p_payload_hash, ''),
      p_idempotency_key
    );
  end if;

  return v_session;
end;
$$;

alter table public.call_sessions enable row level security;
alter table public.call_session_events enable row level security;
revoke all on table public.call_sessions from anon, authenticated;
revoke all on table public.call_session_events from anon, authenticated;
revoke all on function public.create_call_session(uuid, uuid, text, text, integer, timestamptz, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.transition_call_session(uuid, text, integer, integer, text, text, jsonb, text, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
grant select, insert, update, delete on table public.call_sessions to service_role;
grant select, insert, update, delete on table public.call_session_events to service_role;
grant execute on function public.create_call_session(uuid, uuid, text, text, integer, timestamptz, text, jsonb, text) to service_role;
grant execute on function public.transition_call_session(uuid, text, integer, integer, text, text, jsonb, text, timestamptz, timestamptz, timestamptz) to service_role;

-- ============================================================================
-- Caller classification decision audit log
-- ============================================================================

create table if not exists public.caller_classification_audits (
  id uuid primary key default gen_random_uuid(),
  decision text not null check (decision in ('eligible_callback', 'session_in_progress', 'paid_booking_no_session', 'unpaid_booking', 'unknown_number', 'session_completed', 'callback_window_expired', 'ambiguous_match', 'invalid_phone', 'missing_secret', 'store_error', 'audit_error', 'idempotency_conflict')),
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
