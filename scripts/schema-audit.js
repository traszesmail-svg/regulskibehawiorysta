const { existsSync, readFileSync } = require('node:fs')
const path = require('node:path')

const REQUIRED_SCHEMA_MARKERS = [
  {
    label: 'bookings.qa_booking',
    needle: 'qa_booking boolean not null default false',
    expectedCount: 1,
  },
  {
    label: 'funnel_events.qa_booking',
    needle: 'qa_booking boolean not null default false',
    expectedCount: 2,
  },
  {
    label: 'bookings.payment_method',
    needle: "payment_method text check (payment_method in ('manual', 'payu', 'stripe', 'mock', 'promo'))",
    expectedCount: 1,
  },
  {
    label: 'promo_campaigns',
    needle: 'create table if not exists public.promo_campaigns',
    expectedCount: 1,
  },
  {
    label: 'promo_codes',
    needle: 'create table if not exists public.promo_codes',
    expectedCount: 1,
  },
  {
    label: 'promo_redemptions',
    needle: 'create table if not exists public.promo_redemptions',
    expectedCount: 1,
  },
  {
    label: 'promo_campaigns.campaign_kind',
    needle: "campaign_kind text not null default 'clinic' check (campaign_kind in ('clinic', 'community'))",
    expectedCount: 1,
  },
  {
    label: 'promo_campaigns.promotion_price',
    needle: 'promotion_price numeric(10,2) not null default 0 check (',
    expectedCount: 1,
  },
  {
    label: 'promo_redemptions.campaign_kind',
    needle: "campaign_kind text not null default 'clinic' check (campaign_kind in ('clinic', 'community'))",
    expectedCount: 2,
  },
  {
    label: 'push_subscriptions',
    needle: 'create table if not exists public.push_subscriptions',
    expectedCount: 1,
  },
  {
    label: 'zapytaj_live_notifications',
    needle: 'create table if not exists public.zapytaj_live_notifications',
    expectedCount: 1,
  },
  {
    label: 'bookings.payment_reference',
    needle: 'payment_reference text',
    expectedCount: 1,
  },
  {
    label: 'bookings.payu_order_id',
    needle: 'payu_order_id text',
    expectedCount: 1,
  },
  {
    label: 'bookings.payu_order_status',
    needle: 'payu_order_status text',
    expectedCount: 1,
  },
  {
    label: 'bookings.sms_confirmation_status',
    needle: 'sms_confirmation_status text check (',
    expectedCount: 1,
  },
  {
    label: 'bookings.call_attempt',
    needle: 'call_attempt integer not null default 0',
    expectedCount: 1,
  },
  {
    label: 'bookings.call_recovery_token_hash',
    needle: 'call_recovery_token_hash text',
    expectedCount: 1,
  },
  {
    label: 'bookings.consultation_access_code_hash',
    needle: 'consultation_access_code_hash text',
    expectedCount: 1,
  },
  {
    label: 'bookings.recommended_material_slug',
    needle: 'recommended_material_slug text',
    expectedCount: 1,
  },
  {
    label: 'bookings.questions_expires_at',
    needle: 'questions_expires_at timestamptz',
    expectedCount: 1,
  },
  {
    label: 'bookings.customer_access_token_hash',
    needle: "customer_access_token_hash text not null default ''",
    expectedCount: 1,
  },
  {
    label: 'lead_bookings',
    needle: 'create table if not exists public.lead_bookings',
    expectedCount: 1,
  },
  {
    label: 'lead_bookings.questions_expires_at',
    needle: 'questions_expires_at timestamptz',
    expectedCount: 2,
  },
  {
    label: 'lead_bookings.voip_fields',
    needle: 'questions_remaining integer',
    expectedCount: 2,
  },
  {
    label: 'phone_agent_state',
    needle: 'create table if not exists public.phone_agent_state',
    expectedCount: 1,
  },
  {
    label: 'phone_agent_sms_queue',
    needle: 'create table if not exists public.phone_agent_sms_queue',
    expectedCount: 1,
  },
  {
    label: 'claim_next_phone_agent_sms',
    needle: 'create or replace function public.claim_next_phone_agent_sms()',
    expectedCount: 1,
  },
  {
    label: 'zapytaj_live_status',
    needle: 'create table if not exists public.zapytaj_live_status',
    expectedCount: 1,
  },
  {
    label: 'bookings.booking_status',
    needle:
      "booking_status text not null check (booking_status in ('pending', 'pending_manual_payment', 'confirmed', 'done', 'cancelled', 'expired'))",
    expectedCount: 1,
  },
  {
    label: 'bookings.payment_status',
    needle:
      "payment_status text not null check (payment_status in ('unpaid', 'pending_manual_review', 'paid', 'failed', 'rejected', 'refunded'))",
    expectedCount: 1,
  },
  {
    label: 'case_maps',
    needle: 'create table if not exists public.case_maps',
    expectedCount: 1,
  },
  {
    label: 'case_map_profile_claims',
    needle: 'create table if not exists public.case_map_profile_claims',
    expectedCount: 1,
  },
  {
    label: 'case_map_profile_claim_cleanup',
    needle: 'create or replace function public.regulski_delete_expired_case_map_profile_claims()',
    expectedCount: 1,
  },
  {
    label: 'case_map_profile_claim_token',
    needle: 'claim_token_hash text not null',
    expectedCount: 1,
  },
  {
    label: 'growth_signups',
    needle: 'create table if not exists public.growth_signups',
    expectedCount: 1,
  },
  {
    label: 'growth_signups.marketing_opt_in',
    needle: 'marketing_opt_in boolean not null default false',
    expectedCount: 1,
  },
  {
    label: 'growth_signups.unsubscribe_token',
    needle: 'unsubscribe_token text',
    expectedCount: 1,
  },
  {
    label: 'revolut_payment_reconciliation_claims',
    needle: 'create table if not exists public.revolut_payment_reconciliation_claims',
    expectedCount: 1,
  },
  {
    label: 'claim_revolut_payment_notification',
    needle: 'create or replace function public.claim_revolut_payment_notification(',
    expectedCount: 1,
  },
  {
    label: 'reconcile_revolut_payment_notification',
    needle: 'create or replace function public.reconcile_revolut_payment_notification(',
    expectedCount: 1,
  },
  {
    label: 'call_sessions',
    needle: 'create table if not exists public.call_sessions',
    expectedCount: 1,
  },
  {
    label: 'call_sessions.caller_phone_fingerprint',
    needle: 'caller_phone_fingerprint text not null',
    expectedCount: 1,
  },
  {
    label: 'call_sessions.caller_phone_masked',
    needle: 'caller_phone_masked text not null',
    expectedCount: 1,
  },
  {
    label: 'call_sessions.remaining_seconds',
    needle: 'remaining_seconds integer not null default 900 check (',
    expectedCount: 1,
  },
  {
    label: 'call_session_events',
    needle: 'create table if not exists public.call_session_events',
    expectedCount: 1,
  },
  {
    label: 'call_session_events.call_session_id',
    needle: 'call_session_id uuid not null references public.call_sessions(id) on delete cascade',
    expectedCount: 1,
  },
  {
    label: 'create_call_session',
    needle: 'create or replace function public.create_call_session(',
    expectedCount: 1,
  },
  {
    label: 'transition_call_session',
    needle: 'create or replace function public.transition_call_session(',
    expectedCount: 1,
  },
  {
    label: 'call_sessions.advisory_lock',
    needle: "perform pg_advisory_xact_lock(hashtext('call_session_idempotency:' || p_idempotency_key));",
    expectedCount: 2,
  },
  {
    label: 'transition_call_session.active_resumed_time_only',
    needle: "if coalesce(p_delta_seconds, 0) > 0 and v_old_state not in ('active', 'resumed') then",
    expectedCount: 1,
  },
  {
    label: 'create_call_session.revoke_signature',
    needle: 'revoke all on function public.create_call_session(uuid, uuid, text, text, integer, timestamptz, text, jsonb, text) from public, anon, authenticated;',
    expectedCount: 1,
  },
  {
    label: 'transition_call_session.revoke_signature',
    needle: 'revoke all on function public.transition_call_session(uuid, text, integer, integer, text, text, jsonb, text, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;',
    expectedCount: 1,
  },
  {
    label: 'create_call_session.grant_signature',
    needle: 'grant execute on function public.create_call_session(uuid, uuid, text, text, integer, timestamptz, text, jsonb, text) to service_role;',
    expectedCount: 1,
  },
  {
    label: 'transition_call_session.grant_signature',
    needle: 'grant execute on function public.transition_call_session(uuid, text, integer, integer, text, text, jsonb, text, timestamptz, timestamptz, timestamptz) to service_role;',
    expectedCount: 1,
  },
  {
    label: 'caller_classification_audits',
    needle: 'create table if not exists public.caller_classification_audits',
    expectedCount: 1,
  },
  {
    label: 'caller_classification_audits.decision_check',
    needle: "decision text not null check (decision in ('eligible_callback', 'session_in_progress', 'paid_booking_no_session', 'unpaid_booking', 'unknown_number', 'session_completed', 'callback_window_expired', 'ambiguous_match', 'invalid_phone', 'missing_secret', 'store_error', 'audit_error', 'idempotency_conflict'))",
    expectedCount: 1,
  },
  {
    label: 'caller_classification_audits.request_hash',
    needle: 'request_hash text check (request_hash is null or length(request_hash) >= 16)',
    expectedCount: 1,
  },
  {
    label: 'caller_classification_audits.payload_hash',
    needle: 'payload_hash text check (payload_hash is null or length(payload_hash) >= 16)',
    expectedCount: 1,
  },
  {
    label: 'caller_classification_audits.fingerprint_idx',
    needle: 'create index if not exists caller_classification_audits_fingerprint_idx on public.caller_classification_audits (caller_phone_fingerprint, created_at desc);',
    expectedCount: 1,
  },
  {
    label: 'caller_classification_audits.idempotency_key_idx',
    needle: 'create index if not exists caller_classification_audits_idempotency_key_idx on public.caller_classification_audits (idempotency_key);',
    expectedCount: 1,
  },
  {
    label: 'caller_classification_audits.created_at_idx',
    needle: 'create index if not exists caller_classification_audits_created_at_idx on public.caller_classification_audits (created_at desc);',
    expectedCount: 1,
  },
  {
    label: 'caller_classification_audits.rls',
    needle: 'alter table public.caller_classification_audits enable row level security;',
    expectedCount: 1,
  },
  {
    label: 'caller_classification_audits.revoke_anon_auth',
    needle: 'revoke all on table public.caller_classification_audits from anon, authenticated;',
    expectedCount: 1,
  },
  {
    label: 'caller_classification_audits.grant_service_role',
    needle: 'grant select, insert on table public.caller_classification_audits to service_role;',
    expectedCount: 1,
  },
  {
    label: 'caller_sms_preparations',
    needle: 'create table if not exists public.caller_sms_preparations',
    expectedCount: 1,
  },
  {
    label: 'caller_sms_preparations.status_check',
    needle: "status text not null check (status in ('prepared', 'do_not_send', 'promoted'))",
    expectedCount: 1,
  },
  {
    label: 'caller_sms_preparations.fingerprint_idx',
    needle: 'create index if not exists caller_sms_preparations_fingerprint_idx on public.caller_sms_preparations (caller_phone_fingerprint, prepared_at desc);',
    expectedCount: 1,
  },
  {
    label: 'caller_sms_preparations.idempotency_key_idx',
    needle: 'create index if not exists caller_sms_preparations_idempotency_key_idx on public.caller_sms_preparations (idempotency_key);',
    expectedCount: 1,
  },
  {
    label: 'caller_sms_preparations.created_at_idx',
    needle: 'create index if not exists caller_sms_preparations_created_at_idx on public.caller_sms_preparations (created_at desc);',
    expectedCount: 1,
  },
  {
    label: 'caller_sms_preparations.approval_id_idx',
    needle: 'create unique index if not exists caller_sms_preparations_approval_id_idx on public.caller_sms_preparations (approval_id) where approval_id is not null;',
    expectedCount: 1,
  },
  {
    label: 'caller_sms_preparations.rls',
    needle: 'alter table public.caller_sms_preparations enable row level security;',
    expectedCount: 1,
  },
  {
    label: 'caller_sms_preparations.revoke_anon_auth',
    needle: 'revoke all on table public.caller_sms_preparations from anon, authenticated;',
    expectedCount: 1,
  },
  {
    label: 'caller_sms_preparations.grant_service_role',
    needle: 'grant select, insert, update on table public.caller_sms_preparations to service_role;',
    expectedCount: 1,
  },
  {
    label: 'prepare_caller_sms',
    needle: 'create or replace function public.prepare_caller_sms(',
    expectedCount: 1,
  },
  {
    label: 'prepare_caller_sms.grant_signature',
    needle: 'grant execute on function public.prepare_caller_sms(text, text, text, text, text, text, text, text, text, text, text, timestamptz) to service_role;',
    expectedCount: 1,
  },
  {
    label: 'promote_caller_sms_to_queue',
    needle: 'create or replace function public.promote_caller_sms_to_queue(',
    expectedCount: 1,
  },
  {
    label: 'promote_caller_sms_to_queue.grant_signature',
    needle: 'grant execute on function public.promote_caller_sms_to_queue(uuid, text, text, text, text, timestamptz, integer) to service_role;',
    expectedCount: 1,
  },
  {
    label: 'urgent_intake_requests',
    needle: 'create table if not exists public.urgent_intake_requests',
    expectedCount: 1,
  },
  {
    label: 'urgent_intake_requests.day_choice_check',
    needle: "check (day_choice in ('today', 'tomorrow'))",
    expectedCount: 1,
  },
  {
    label: 'urgent_intake_requests.no_booking_before_payment',
    needle: "check (booking_id is null or state = 'payment_confirmed')",
    expectedCount: 1,
  },
  {
    label: 'urgent_intake_events',
    needle: 'create table if not exists public.urgent_intake_events',
    expectedCount: 1,
  },
  {
    label: 'availability_notification_requests',
    needle: 'create table if not exists public.availability_notification_requests',
    expectedCount: 1,
  },
  {
    label: 'availability_notification_requests.no_booking_before_payment',
    needle: "check (booking_id is null or state in ('accepted_paid', 'consumed'))",
    expectedCount: 1,
  },
  {
    label: 'availability_notification_events',
    needle: 'create table if not exists public.availability_notification_events',
    expectedCount: 1,
  },
  {
    label: 'consultation_talk_entitlements',
    needle: 'create table if not exists public.consultation_talk_entitlements',
    expectedCount: 1,
  },
  {
    label: 'consultation_talk_entitlements.payment_reference_not_empty',
    needle: 'check (length(trim(payment_reference)) > 0)',
    expectedCount: 1,
  },
  {
    label: 'consultation_talk_entitlement_events',
    needle: 'create table if not exists public.consultation_talk_entitlement_events',
    expectedCount: 1,
  },
  {
    label: 'create_urgent_intake_request',
    needle: 'create or replace function public.create_urgent_intake_request(',
    expectedCount: 1,
  },
  {
    label: 'propose_urgent_intake_timeslot',
    needle: 'create or replace function public.propose_urgent_intake_timeslot(',
    expectedCount: 1,
  },
  {
    label: 'confirm_urgent_intake_payment',
    needle: 'create or replace function public.confirm_urgent_intake_payment(',
    expectedCount: 1,
  },
  {
    label: 'transition_urgent_intake_state',
    needle: 'create or replace function public.transition_urgent_intake_state(',
    expectedCount: 1,
  },
  {
    label: 'create_availability_notification_request',
    needle: 'create or replace function public.create_availability_notification_request(',
    expectedCount: 1,
  },
  {
    label: 'offer_availability_notification',
    needle: 'create or replace function public.offer_availability_notification(',
    expectedCount: 1,
  },
  {
    label: 'confirm_notification_offer_payment',
    needle: 'create or replace function public.confirm_notification_offer_payment(',
    expectedCount: 1,
  },
  {
    label: 'transition_availability_notification_state',
    needle: 'create or replace function public.transition_availability_notification_state(',
    expectedCount: 1,
  },
  {
    label: 'create_talk_entitlement',
    needle: 'create or replace function public.create_talk_entitlement(',
    expectedCount: 1,
  },
  {
    label: 'consume_talk_entitlement',
    needle: 'create or replace function public.consume_talk_entitlement(',
    expectedCount: 1,
  },
  {
    label: 'revoke_talk_entitlement',
    needle: 'create or replace function public.revoke_talk_entitlement(',
    expectedCount: 1,
  },
  {
    label: 'availability_notification_queue_seq.revoke_anon_auth',
    needle: 'revoke all on sequence public.availability_notification_queue_seq from public, anon, authenticated;',
    expectedCount: 1,
  },
  {
    label: 'availability_notification_queue_seq.revoke_service_role',
    needle: 'revoke all on sequence public.availability_notification_queue_seq from service_role;',
    expectedCount: 1,
  },
  {
    label: 'availability_notification_queue_seq.grant_service_role',
    needle: 'grant usage, select on sequence public.availability_notification_queue_seq to service_role;',
    expectedCount: 1,
  },
  {
    label: 'urgent_intake_requests.revoke_anon_auth',
    needle: 'revoke all on table public.urgent_intake_requests from public, anon, authenticated;',
    expectedCount: 1,
  },
  {
    label: 'urgent_intake_requests.revoke_service_role',
    needle: 'revoke all on table public.urgent_intake_requests from service_role;',
    expectedCount: 1,
  },
  {
    label: 'urgent_intake_requests.grant_service_role',
    needle: 'grant select, insert, update on table public.urgent_intake_requests to service_role;',
    expectedCount: 1,
  },
  {
    label: 'urgent_intake_events.revoke_anon_auth',
    needle: 'revoke all on table public.urgent_intake_events from public, anon, authenticated;',
    expectedCount: 1,
  },
  {
    label: 'urgent_intake_events.revoke_service_role',
    needle: 'revoke all on table public.urgent_intake_events from service_role;',
    expectedCount: 1,
  },
  {
    label: 'urgent_intake_events.grant_service_role',
    needle: 'grant select, insert on table public.urgent_intake_events to service_role;',
    expectedCount: 1,
  },
  {
    label: 'availability_notification_requests.revoke_anon_auth',
    needle: 'revoke all on table public.availability_notification_requests from public, anon, authenticated;',
    expectedCount: 1,
  },
  {
    label: 'availability_notification_requests.revoke_service_role',
    needle: 'revoke all on table public.availability_notification_requests from service_role;',
    expectedCount: 1,
  },
  {
    label: 'availability_notification_requests.grant_service_role',
    needle: 'grant select, insert, update on table public.availability_notification_requests to service_role;',
    expectedCount: 1,
  },
  {
    label: 'availability_notification_events.revoke_anon_auth',
    needle: 'revoke all on table public.availability_notification_events from public, anon, authenticated;',
    expectedCount: 1,
  },
  {
    label: 'availability_notification_events.revoke_service_role',
    needle: 'revoke all on table public.availability_notification_events from service_role;',
    expectedCount: 1,
  },
  {
    label: 'availability_notification_events.grant_service_role',
    needle: 'grant select, insert on table public.availability_notification_events to service_role;',
    expectedCount: 1,
  },
  {
    label: 'consultation_talk_entitlements.revoke_anon_auth',
    needle: 'revoke all on table public.consultation_talk_entitlements from public, anon, authenticated;',
    expectedCount: 1,
  },
  {
    label: 'consultation_talk_entitlements.revoke_service_role',
    needle: 'revoke all on table public.consultation_talk_entitlements from service_role;',
    expectedCount: 1,
  },
  {
    label: 'consultation_talk_entitlements.grant_service_role',
    needle: 'grant select, insert, update on table public.consultation_talk_entitlements to service_role;',
    expectedCount: 1,
  },
  {
    label: 'consultation_talk_entitlement_events.revoke_anon_auth',
    needle: 'revoke all on table public.consultation_talk_entitlement_events from public, anon, authenticated;',
    expectedCount: 1,
  },
  {
    label: 'consultation_talk_entitlement_events.revoke_service_role',
    needle: 'revoke all on table public.consultation_talk_entitlement_events from service_role;',
    expectedCount: 1,
  },
  {
    label: 'consultation_talk_entitlement_events.grant_service_role',
    needle: 'grant select, insert on table public.consultation_talk_entitlement_events to service_role;',
    expectedCount: 1,
  },
  {
    label: 'consultation_talk_entitlements.notification_request_id_idx',
    needle: 'create unique index if not exists consultation_talk_entitlements_notification_request_id_idx on public.consultation_talk_entitlements (notification_request_id) where notification_request_id is not null;',
    expectedCount: 1,
  },
  {
    label: 'sweep_expired_section16_records',
    needle: 'create or replace function public.sweep_expired_section16_records(',
    expectedCount: 1,
  },
  {
    label: 'sweep_expired_section16_records.revoke_anon_auth',
    needle: 'revoke all on function public.sweep_expired_section16_records(integer) from public, anon, authenticated;',
    expectedCount: 1,
  },
  {
    label: 'sweep_expired_section16_records.grant_service_role',
    needle: 'grant execute on function public.sweep_expired_section16_records(integer) to service_role;',
    expectedCount: 1,
  },
]

const REQUIRED_FILES = [
  'supabase/migrations/20260501_lead_bookings.sql',
  'supabase/migrations/20260712001_bookings_voip_fields.sql',
  'supabase/migrations/20260902001_questions_expiry.sql',
  'supabase/migrations/20260325_manual_payment_and_payu.sql',
  'supabase/migrations/20260406002_qa_checkout.sql',
  'supabase/migrations/20260601001_promo_codes.sql',
  'supabase/migrations/20260601005_push_subscriptions.sql',
  'supabase/migrations/20260714001_case_maps.sql',
  'supabase/migrations/20260714002_case_map_consultant_handoff.sql',
  'supabase/migrations/20260717001_case_map_analytics_and_profile_claims.sql',
  'supabase/migrations/20260717002_case_map_profile_claim_tokens.sql',
  'supabase/migrations/20260901001_zapytaj_flow.sql',
  'supabase/migrations/20260917001_phone_agent_durable_state.sql',
  'supabase/migrations/20260901002_zapytaj_live_notifications.sql',
  'supabase/migrations/20260901003_zapytaj_call_recovery.sql',
  'supabase/migrations/20260901004_zapytaj_zadarma_scheduler.sql',
  'supabase/migrations/20260901005_consultation_access_codes.sql',
  'supabase/migrations/20260901006_reconcile_booking_sms_columns.sql',
  'supabase/migrations/20260901007_recommendation_material.sql',
  'supabase/migrations/20260901008_community_promo_campaigns.sql',
  'supabase/migrations/20260326_sms_payment_confirmation.sql',
  'supabase/migrations/20260718001_growth_signup_marketing_opt_in.sql',
  'supabase/migrations/20260718002_repair_reminder_scheduler.sql',
  'supabase/migrations/20261005001_revolut_payment_reconciliation_ledger.sql',
  'supabase/migrations/20261007001_atomic_revolut_payment_reconciliation.sql',
  'supabase/migrations/20261007002_cron_history_retention.sql',
  'supabase/migrations/20261007003_revolut_rpc_permissions.sql',
  'supabase/migrations/20261010002_remove_duplicate_availability_index.sql',
  'supabase/migrations/20261011001_call_sessions_durable_model.sql',
  'supabase/migrations/20261011002_caller_classification_audit.sql',
  'supabase/migrations/20261011003_caller_sms_preparations.sql',
  'supabase/migrations/20261011004_stage4_controlled_sms_promotion.sql',
  'supabase/migrations/20261011005_section16_autonomous_intake_and_entitlements.sql',
  'supabase/migrations/20261011006_section16_append_only_acl.sql',
  'supabase/migrations/20261011007_section16_single_entitlement_for_paid_source.sql',
  'supabase/migrations/20261011008_section16_expiration_sweep.sql',
]

function normalizeSchemaText(schemaText) {
  return schemaText.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase()
}

function countOccurrences(source, needle) {
  if (!needle) {
    return 0
  }

  let count = 0
  let index = source.indexOf(needle)

  while (index !== -1) {
    count += 1
    index = source.indexOf(needle, index + needle.length)
  }

  return count
}

function buildSummary(missingFiles, missingMarkers) {
  const missingSections = []

  if (missingFiles.length > 0) {
    missingSections.push(`missing files: ${missingFiles.join(', ')}`)
  }

  if (missingMarkers.length > 0) {
    missingSections.push(
      `missing markers: ${missingMarkers
        .map((issue) => `${issue.label} (${issue.foundCount}/${issue.expectedCount})`)
        .join(', ')}`,
    )
  }

  if (missingSections.length === 0) {
    return 'Canonical Supabase schema contains required runtime tables and rollout markers.'
  }

  return `Supabase schema audit failed: ${missingSections.join('; ')}.`
}

function auditSupabaseSchemaText(schemaText) {
  const normalizedSchemaText = normalizeSchemaText(schemaText)
  const missingMarkers = REQUIRED_SCHEMA_MARKERS.flatMap((marker) => {
    const foundCount = countOccurrences(normalizedSchemaText, marker.needle)

    if (foundCount >= marker.expectedCount) {
      return []
    }

    return [
      {
        label: marker.label,
        expectedCount: marker.expectedCount,
        foundCount,
      },
    ]
  })

  return {
    ok: missingMarkers.length === 0,
    missingFiles: [],
    missingMarkers,
    summary: buildSummary([], missingMarkers),
  }
}

function getSupabaseSchemaAudit(rootDir = process.cwd()) {
  const schemaPath = path.join(rootDir, 'supabase', 'schema.sql')
  const requiredFiles = REQUIRED_FILES.map((relativePath) => {
    const absolutePath = path.join(rootDir, relativePath)

    return {
      path: relativePath,
      exists: existsSync(absolutePath),
    }
  })

  const missingFiles = requiredFiles.filter((file) => !file.exists).map((file) => file.path)
  const schemaText = existsSync(schemaPath) ? readFileSync(schemaPath, 'utf8') : ''
  const textAudit = auditSupabaseSchemaText(schemaText)

  return {
    ok: missingFiles.length === 0 && textAudit.ok,
    schemaPath,
    requiredFiles,
    missingFiles,
    missingMarkers: textAudit.missingMarkers,
    summary: buildSummary(missingFiles, textAudit.missingMarkers),
  }
}

function main() {
  const audit = getSupabaseSchemaAudit()

  console.log(`Schema audit file: ${audit.schemaPath}`)

  for (const file of audit.requiredFiles) {
    const state = file.exists ? 'ok' : 'missing'
    console.log(`- ${state} | ${file.path}`)
  }

  if (audit.ok) {
    console.log(audit.summary)
    return
  }

  for (const file of audit.missingFiles) {
    console.error(`Missing required file: ${file}`)
  }

  for (const issue of audit.missingMarkers) {
    console.error(`Missing schema marker: ${issue.label} (${issue.foundCount}/${issue.expectedCount})`)
  }

  console.error(audit.summary)
  process.exitCode = 1
}

if (require.main === module) {
  main()
}

module.exports = {
  REQUIRED_SCHEMA_MARKERS,
  REQUIRED_FILES,
  auditSupabaseSchemaText,
  getSupabaseSchemaAudit,
}
