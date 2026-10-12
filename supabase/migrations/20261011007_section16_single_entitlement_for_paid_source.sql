-- Section 16 Stage 4: Single Entitlement for Paid Availability Source
-- 1. Base unique index on consultation_talk_entitlements(notification_request_id) for non-NULL source,
--    preventing duplicate entitlements for the same availability notification request even across different idempotency keys.
-- 2. Transactional hardening of create_talk_entitlement RPC: row lock on availability_notification_requests,
--    deterministic existence check, and ENTITLEMENT_ALREADY_EXISTS exception on alternative idempotency key.
-- 3. Strict SECURITY DEFINER, search_path, and service_role-only execute privilege (no public/anon/authenticated).

-- 1. BASE UNIQUE INDEX ON NOTIFICATION_REQUEST_ID (NON-NULL)
create unique index if not exists consultation_talk_entitlements_notification_request_id_idx
  on public.consultation_talk_entitlements (notification_request_id)
  where notification_request_id is not null;

-- 2. TRANSACTIONAL RPC HARDENING: create_talk_entitlement
create or replace function public.create_talk_entitlement(
  p_entitlement_id uuid,
  p_caller_phone_fingerprint text,
  p_caller_phone_masked text,
  p_payment_reference text,
  p_booking_id uuid,
  p_urgent_request_id uuid,
  p_notification_request_id uuid,
  p_allocated_seconds integer,
  p_valid_from timestamptz,
  p_valid_until timestamptz,
  p_idempotency_key text,
  p_payload jsonb,
  p_payload_hash text
)
returns public.consultation_talk_entitlements
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ent public.consultation_talk_entitlements%rowtype;
  v_existing_event public.consultation_talk_entitlement_events%rowtype;
  v_urg_req public.urgent_intake_requests%rowtype;
  v_notif_req public.availability_notification_requests%rowtype;
  v_booking public.bookings%rowtype;
  v_new_id uuid := coalesce(p_entitlement_id, gen_random_uuid());
  v_allocated integer := coalesce(p_allocated_seconds, 900);
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 or length(trim(p_idempotency_key)) > 128 then
    raise exception 'INVALID_IDEMPOTENCY_KEY: Klucz idempotencji jest wymagany i musi mieć od 1 do 128 znaków';
  end if;

  if p_payload_hash is null or length(trim(p_payload_hash)) = 0 then
    raise exception 'INVALID_PAYLOAD_HASH: Hash payloadu jest wymagany';
  end if;

  perform pg_advisory_xact_lock(hashtext('talk_entitlement_idempotency:' || p_idempotency_key));

  select * into v_existing_event
  from public.consultation_talk_entitlement_events
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing_event.payload_hash <> p_payload_hash then
      raise exception 'IDEMPOTENCY_CONFLICT: Klucz % został już użyty z innym ładunkiem', p_idempotency_key;
    end if;
    select * into v_ent from public.consultation_talk_entitlements where id = v_existing_event.entitlement_id;
    return v_ent;
  end if;

  if p_payment_reference is null or length(trim(p_payment_reference)) = 0 then
    raise exception 'PAYMENT_REQUIRED: Uprawnienie do rozmowy bezwzględnie wymaga potwierdzonej płatności';
  end if;

  if p_valid_from is null or p_valid_until is null or p_valid_until <= p_valid_from then
    raise exception 'INVALID_VALIDITY_WINDOW: Okno ważności uprawnienia jest nieprawidłowe (valid_until musi być późniejsze niż valid_from)';
  end if;

  if p_caller_phone_fingerprint is null or length(trim(p_caller_phone_fingerprint)) = 0 then
    raise exception 'INVALID_FINGERPRINT: Wymagany jest fingerprint numeru telefonu';
  end if;

  -- Binding to authoritative paid source: at least one source required
  if p_urgent_request_id is null and p_notification_request_id is null and p_booking_id is null then
    raise exception 'PAYMENT_SOURCE_REQUIRED: Uprawnienie do rozmowy wymaga co najmniej jednego autorytatywnego opłaconego źródła (urgent_request_id, notification_request_id lub booking_id)';
  end if;

  if p_urgent_request_id is not null then
    select * into v_urg_req from public.urgent_intake_requests where id = p_urgent_request_id;
    if not found then
      raise exception 'SOURCE_NOT_FOUND: Zgłoszenie pilne % nie istnieje', p_urgent_request_id;
    end if;
    if v_urg_req.state <> 'payment_confirmed' then
      raise exception 'UNPAID_SOURCE: Zgłoszenie pilne % nie posiada potwierdzonej płatności (stan: %)', p_urgent_request_id, v_urg_req.state;
    end if;
    if v_urg_req.caller_phone_fingerprint <> p_caller_phone_fingerprint then
      raise exception 'FINGERPRINT_MISMATCH: Fingerprint numeru telefonu nie zgadza się ze zgłoszeniem pilnym';
    end if;
    if v_urg_req.payment_reference <> trim(p_payment_reference) then
      raise exception 'PAYMENT_REFERENCE_MISMATCH: Referencja płatności nie zgadza się ze zgłoszeniem pilnym';
    end if;
    if p_booking_id is not null and v_urg_req.booking_id is not null and p_booking_id <> v_urg_req.booking_id then
      raise exception 'CONFLICTING_SOURCES: Podany booking_id nie zgadza się z rezerwacją przypisaną do zgłoszenia pilnego';
    end if;
  end if;

  if p_notification_request_id is not null then
    -- Transactional row lock on authoritative source
    select * into v_notif_req from public.availability_notification_requests where id = p_notification_request_id for update;
    if not found then
      raise exception 'SOURCE_NOT_FOUND: Zgłoszenie powiadomienia % nie istnieje', p_notification_request_id;
    end if;
    if v_notif_req.state <> 'accepted_paid' then
      raise exception 'UNPAID_SOURCE: Zgłoszenie powiadomienia % nie posiada opłaconej oferty (stan: %)', p_notification_request_id, v_notif_req.state;
    end if;
    if v_notif_req.caller_phone_fingerprint <> p_caller_phone_fingerprint then
      raise exception 'FINGERPRINT_MISMATCH: Fingerprint numeru telefonu nie zgadza się ze zgłoszeniem powiadomienia';
    end if;
    if v_notif_req.payment_reference <> trim(p_payment_reference) then
      raise exception 'PAYMENT_REFERENCE_MISMATCH: Referencja płatności nie zgadza się ze zgłoszeniem powiadomienia';
    end if;
    if p_booking_id is not null and v_notif_req.booking_id is not null and p_booking_id <> v_notif_req.booking_id then
      raise exception 'CONFLICTING_SOURCES: Podany booking_id nie zgadza się z rezerwacją przypisaną do zgłoszenia powiadomienia';
    end if;

    -- Deterministic check for existing entitlement under different idempotency key
    select * into v_ent from public.consultation_talk_entitlements where notification_request_id = p_notification_request_id;
    if found then
      raise exception 'ENTITLEMENT_ALREADY_EXISTS: Dla opłaconej oferty % istnieje już uprawnienie do rozmowy (id: %)', p_notification_request_id, v_ent.id;
    end if;
  end if;

  if p_urgent_request_id is not null and p_notification_request_id is not null then
    if v_urg_req.payment_reference <> v_notif_req.payment_reference or v_urg_req.caller_phone_fingerprint <> v_notif_req.caller_phone_fingerprint then
      raise exception 'CONFLICTING_SOURCES: Źródła płatności nie są ze sobą zgodne';
    end if;
    if v_urg_req.booking_id is not null and v_notif_req.booking_id is not null and v_urg_req.booking_id <> v_notif_req.booking_id then
      raise exception 'CONFLICTING_SOURCES: Rezerwacje w źródłach nie są ze sobą zgodne';
    end if;
  end if;

  if p_booking_id is not null then
    select * into v_booking from public.bookings where id = p_booking_id;
    if not found then
      raise exception 'BOOKING_NOT_FOUND: Rezerwacja % nie istnieje', p_booking_id;
    end if;
    if v_booking.payment_status <> 'paid' or v_booking.paid_at is null or v_booking.booking_status in ('cancelled', 'expired') then
      raise exception 'UNPAID_BOOKING: Rezerwacja % nie posiada potwierdzonego statusu płatności (stan: %)', p_booking_id, v_booking.payment_status;
    end if;
    if v_booking.payment_reference is not null and trim(v_booking.payment_reference) <> trim(p_payment_reference) then
      raise exception 'PAYMENT_REFERENCE_MISMATCH: Referencja płatności nie zgadza się z rezerwacją';
    end if;
  end if;

  insert into public.consultation_talk_entitlements (
    id,
    caller_phone_fingerprint,
    caller_phone_masked,
    booking_id,
    payment_reference,
    urgent_request_id,
    notification_request_id,
    allocated_seconds,
    valid_from,
    valid_until,
    state,
    version,
    idempotency_key,
    created_at,
    updated_at
  ) values (
    v_new_id,
    p_caller_phone_fingerprint,
    p_caller_phone_masked,
    coalesce(p_booking_id, v_urg_req.booking_id, v_notif_req.booking_id),
    trim(p_payment_reference),
    p_urgent_request_id,
    p_notification_request_id,
    v_allocated,
    p_valid_from,
    p_valid_until,
    'active',
    1,
    p_idempotency_key,
    timezone('utc', now()),
    timezone('utc', now())
  )
  returning * into v_ent;

  insert into public.consultation_talk_entitlement_events (
    entitlement_id,
    event_type,
    from_state,
    to_state,
    payload,
    payload_hash,
    idempotency_key
  ) values (
    v_ent.id,
    'entitlement_created',
    null,
    'active',
    coalesce(p_payload, '{}'::jsonb),
    p_payload_hash,
    p_idempotency_key
  );

  return v_ent;
end;
$$;

revoke all on function public.create_talk_entitlement(uuid, text, text, text, uuid, uuid, uuid, integer, timestamptz, timestamptz, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.create_talk_entitlement(uuid, text, text, text, uuid, uuid, uuid, integer, timestamptz, timestamptz, text, jsonb, text) to service_role;
