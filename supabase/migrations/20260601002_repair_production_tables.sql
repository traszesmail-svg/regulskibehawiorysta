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

create index if not exists funnel_events_created_at_idx on public.funnel_events(created_at desc);
create index if not exists funnel_events_event_type_idx on public.funnel_events(event_type);
create index if not exists funnel_events_qa_booking_idx on public.funnel_events(qa_booking);
create index if not exists funnel_events_booking_id_idx on public.funnel_events(booking_id);
create index if not exists urgent_now_requests_created_at_idx on public.urgent_now_requests(created_at desc);
create index if not exists urgent_now_requests_status_idx on public.urgent_now_requests(status, created_at desc);
create index if not exists pending_testimonials_created_at_idx on public.pending_testimonials(created_at desc);
create index if not exists pending_testimonials_status_idx on public.pending_testimonials(status, created_at desc);

alter table public.pending_testimonials enable row level security;
revoke all on table public.pending_testimonials from anon, authenticated;
grant all on table public.pending_testimonials to service_role;
drop policy if exists "service role full access" on public.pending_testimonials;
create policy "service role full access" on public.pending_testimonials
  for all
  to service_role
  using (true)
  with check (true);
