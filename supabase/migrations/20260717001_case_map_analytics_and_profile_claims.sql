alter table public.funnel_events drop constraint if exists funnel_events_event_type_check;

alter table public.funnel_events
  add constraint funnel_events_event_type_check
    check (
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
    );

create table if not exists public.case_map_profile_claims (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  email_hash text not null,
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

do $$
begin
  if exists(select 1 from cron.job where jobname = 'regulski-case-map-profile-claims-cleanup') then
    perform cron.unschedule('regulski-case-map-profile-claims-cleanup');
  end if;

  perform cron.schedule(
    'regulski-case-map-profile-claims-cleanup',
    '*/5 * * * *',
    $job$select public.regulski_delete_expired_case_map_profile_claims();$job$
  );
end;
$$;
