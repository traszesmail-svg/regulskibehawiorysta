-- Section 16 Append-Only and Monotonic ACL Hardening
-- Hardens permissions on Section 16 tables and sequence for service_role,
-- stripping default privileges (pg_default_acl: UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on event tables,
-- DELETE/TRUNCATE/REFERENCES/TRIGGER on main tables, and UPDATE on sequence).
-- Ensures public, anon, and authenticated have no access.

-- 1. DEDICATED SEQUENCE: AVAILABILITY NOTIFICATION QUEUE
-- Strip UPDATE to protect monotonicity (prevents setval), grant minimal USAGE and SELECT for nextval and diagnostics
revoke all on sequence public.availability_notification_queue_seq from public, anon, authenticated;
revoke all on sequence public.availability_notification_queue_seq from service_role;
grant usage, select on sequence public.availability_notification_queue_seq to service_role;

-- 2. MAIN TABLES: SERVICE_ROLE MINIMAL PRIVILEGES (SELECT, INSERT, UPDATE ONLY)
-- Explicitly revoke ALL from service_role to strip default privileges (DELETE/TRUNCATE/REFERENCES/TRIGGER)
revoke all on table public.urgent_intake_requests from public, anon, authenticated;
revoke all on table public.urgent_intake_requests from service_role;
grant select, insert, update on table public.urgent_intake_requests to service_role;

revoke all on table public.availability_notification_requests from public, anon, authenticated;
revoke all on table public.availability_notification_requests from service_role;
grant select, insert, update on table public.availability_notification_requests to service_role;

revoke all on table public.consultation_talk_entitlements from public, anon, authenticated;
revoke all on table public.consultation_talk_entitlements from service_role;
grant select, insert, update on table public.consultation_talk_entitlements to service_role;

-- 3. EVENT TABLES: SERVICE_ROLE STRICT APPEND-ONLY PRIVILEGES (SELECT, INSERT ONLY)
-- Explicitly revoke ALL from service_role to strip default privileges (UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER)
revoke all on table public.urgent_intake_events from public, anon, authenticated;
revoke all on table public.urgent_intake_events from service_role;
grant select, insert on table public.urgent_intake_events to service_role;

revoke all on table public.availability_notification_events from public, anon, authenticated;
revoke all on table public.availability_notification_events from service_role;
grant select, insert on table public.availability_notification_events to service_role;

revoke all on table public.consultation_talk_entitlement_events from public, anon, authenticated;
revoke all on table public.consultation_talk_entitlement_events from service_role;
grant select, insert on table public.consultation_talk_entitlement_events to service_role;

-- 4. REAFFIRM FAIL-CLOSED SECURITY FOR SECTION 16 TRANSACTIONAL RPCS
revoke all on function public.create_urgent_intake_request(uuid, text, date, text, text, text, text, text, timestamptz, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.propose_urgent_intake_timeslot(uuid, integer, date, text, timestamptz, timestamptz, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.confirm_urgent_intake_payment(uuid, integer, text, uuid, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.transition_urgent_intake_state(uuid, text, integer, text, text, jsonb, text) from public, anon, authenticated;

revoke all on function public.create_availability_notification_request(uuid, text, text, text, text, text, timestamptz, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.offer_availability_notification(uuid, integer, timestamptz, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.confirm_notification_offer_payment(uuid, integer, text, uuid, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.transition_availability_notification_state(uuid, text, integer, text, text, jsonb, text) from public, anon, authenticated;

revoke all on function public.create_talk_entitlement(uuid, text, text, text, uuid, uuid, uuid, integer, timestamptz, timestamptz, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.consume_talk_entitlement(uuid, uuid, integer, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.revoke_talk_entitlement(uuid, integer, text, text, jsonb, text) from public, anon, authenticated;

grant execute on function public.create_urgent_intake_request(uuid, text, date, text, text, text, text, text, timestamptz, text, jsonb, text) to service_role;
grant execute on function public.propose_urgent_intake_timeslot(uuid, integer, date, text, timestamptz, timestamptz, text, jsonb, text) to service_role;
grant execute on function public.confirm_urgent_intake_payment(uuid, integer, text, uuid, text, jsonb, text) to service_role;
grant execute on function public.transition_urgent_intake_state(uuid, text, integer, text, text, jsonb, text) to service_role;

grant execute on function public.create_availability_notification_request(uuid, text, text, text, text, text, timestamptz, text, jsonb, text) to service_role;
grant execute on function public.offer_availability_notification(uuid, integer, timestamptz, text, jsonb, text) to service_role;
grant execute on function public.confirm_notification_offer_payment(uuid, integer, text, uuid, text, jsonb, text) to service_role;
grant execute on function public.transition_availability_notification_state(uuid, text, integer, text, text, jsonb, text) to service_role;

grant execute on function public.create_talk_entitlement(uuid, text, text, text, uuid, uuid, uuid, integer, timestamptz, timestamptz, text, jsonb, text) to service_role;
grant execute on function public.consume_talk_entitlement(uuid, uuid, integer, text, jsonb, text) to service_role;
grant execute on function public.revoke_talk_entitlement(uuid, integer, text, text, jsonb, text) to service_role;
