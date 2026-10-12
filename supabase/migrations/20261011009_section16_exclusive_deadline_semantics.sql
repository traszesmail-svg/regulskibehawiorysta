-- Migration 20261011009_section16_exclusive_deadline_semantics.sql
-- Section 16 Stage 5: Unified exclusive deadline semantics (deadline <= now / now >= deadline)
-- Redefining five RPC functions:
-- 1. propose_urgent_intake_timeslot (v_now >= expires_at)
-- 2. confirm_urgent_intake_payment (v_now >= hold_expires_at)
-- 3. offer_availability_notification (v_now >= expires_at)
-- 4. confirm_notification_offer_payment (v_now >= offer_expires_at)
-- 5. consume_talk_entitlement (v_now >= valid_until)
--
-- Dead UPDATE ... state='expired' before RAISE EXCEPTION removed:
-- Sweeper (sweep_expired_section16_records from 11008) is the authoritative owner of transitions to expired.
-- Operations at or after deadline strictly fail-closed with controlled exception without mutating state/version/events.
-- Preserving idempotency advisory locks, exact retry logic, row locks, CAS, security definer, search_path, and service_role execute permissions.

create or replace function public.propose_urgent_intake_timeslot(
  p_request_id uuid,
  p_expected_version integer,
  p_proposed_date date,
  p_proposed_time text,
  p_proposed_timeslot_iso timestamptz,
  p_hold_expires_at timestamptz,
  p_idempotency_key text,
  p_payload jsonb,
  p_payload_hash text
)
returns public.urgent_intake_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_req public.urgent_intake_requests%rowtype;
  v_existing_event public.urgent_intake_events%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 or length(trim(p_idempotency_key)) > 128 then
    raise exception 'INVALID_IDEMPOTENCY_KEY: Klucz idempotencji jest wymagany i musi mieć od 1 do 128 znaków';
  end if;

  if p_payload_hash is null or length(trim(p_payload_hash)) = 0 then
    raise exception 'INVALID_PAYLOAD_HASH: Hash payloadu jest wymagany';
  end if;

  perform pg_advisory_xact_lock(hashtext('urgent_intake_idempotency:' || p_idempotency_key));

  select * into v_existing_event
  from public.urgent_intake_events
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing_event.payload_hash <> p_payload_hash then
      raise exception 'IDEMPOTENCY_CONFLICT: Klucz % został już użyty z innym ładunkiem', p_idempotency_key;
    end if;
    if v_existing_event.request_id <> p_request_id then
      raise exception 'IDEMPOTENCY_CONFLICT: Klucz % został użyty dla innego zgłoszenia', p_idempotency_key;
    end if;
    select * into v_req from public.urgent_intake_requests where id = p_request_id;
    return v_req;
  end if;

  select * into v_req
  from public.urgent_intake_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND: Zgłoszenie % nie istnieje', p_request_id;
  end if;

  if v_req.state in ('payment_confirmed', 'expired', 'cancelled', 'rejected') then
    raise exception 'TERMINAL_STATE: Nie można proponować terminu w stanie terminalnym %', v_req.state;
  end if;

  if v_now >= v_req.expires_at then
    raise exception 'REQUEST_EXPIRED: Zgłoszenie pilne wygasło przed propozycją terminu';
  end if;

  if p_expected_version is not null and v_req.version <> p_expected_version then
    raise exception 'CONCURRENCY_CONFLICT: Oczekiwano wersji %, aktualna %', p_expected_version, v_req.version;
  end if;

  if p_proposed_date <> v_req.target_date then
    raise exception 'DATE_MISMATCH: Proponowana data % nie zgadza się z wybranym dniem docelowym %', p_proposed_date, v_req.target_date;
  end if;

  if p_hold_expires_at is null or p_hold_expires_at <= v_now then
    raise exception 'INVALID_HOLD: Czas wygaśnięcia blokady musi być w przyszłości';
  end if;

  update public.urgent_intake_requests
  set
    state = 'timeslot_proposed',
    proposed_date = p_proposed_date,
    proposed_time = p_proposed_time,
    proposed_timeslot_iso = p_proposed_timeslot_iso,
    hold_expires_at = p_hold_expires_at,
    version = v_req.version + 1,
    updated_at = v_now
  where id = p_request_id
  returning * into v_req;

  insert into public.urgent_intake_events (
    request_id,
    event_type,
    from_state,
    to_state,
    payload,
    payload_hash,
    idempotency_key
  ) values (
    v_req.id,
    'timeslot_proposed',
    'pending_proposal',
    'timeslot_proposed',
    coalesce(p_payload, '{}'::jsonb),
    p_payload_hash,
    p_idempotency_key
  );

  return v_req;
end;
$$;

create or replace function public.confirm_urgent_intake_payment(
  p_request_id uuid,
  p_expected_version integer,
  p_payment_reference text,
  p_booking_id uuid,
  p_idempotency_key text,
  p_payload jsonb,
  p_payload_hash text
)
returns public.urgent_intake_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_req public.urgent_intake_requests%rowtype;
  v_existing_event public.urgent_intake_events%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 or length(trim(p_idempotency_key)) > 128 then
    raise exception 'INVALID_IDEMPOTENCY_KEY: Klucz idempotencji jest wymagany i musi mieć od 1 do 128 znaków';
  end if;

  if p_payload_hash is null or length(trim(p_payload_hash)) = 0 then
    raise exception 'INVALID_PAYLOAD_HASH: Hash payloadu jest wymagany';
  end if;

  perform pg_advisory_xact_lock(hashtext('urgent_intake_idempotency:' || p_idempotency_key));

  select * into v_existing_event
  from public.urgent_intake_events
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing_event.payload_hash <> p_payload_hash then
      raise exception 'IDEMPOTENCY_CONFLICT: Klucz % został już użyty z innym ładunkiem', p_idempotency_key;
    end if;
    if v_existing_event.request_id <> p_request_id then
      raise exception 'IDEMPOTENCY_CONFLICT: Klucz % został użyty dla innego zgłoszenia', p_idempotency_key;
    end if;
    select * into v_req from public.urgent_intake_requests where id = p_request_id;
    return v_req;
  end if;

  select * into v_req
  from public.urgent_intake_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND: Zgłoszenie % nie istnieje', p_request_id;
  end if;

  if v_req.state <> 'timeslot_proposed' then
    raise exception 'INVALID_STATE: Potwierdzenie płatności wymaga stanu timeslot_proposed (aktualny: %)', v_req.state;
  end if;

  if v_req.hold_expires_at is not null and v_now >= v_req.hold_expires_at then
    raise exception 'HOLD_EXPIRED: Proponowany termin i blokada wygasły przed opłaceniem';
  end if;

  if p_expected_version is not null and v_req.version <> p_expected_version then
    raise exception 'CONCURRENCY_CONFLICT: Oczekiwano wersji %, aktualna %', p_expected_version, v_req.version;
  end if;

  if p_payment_reference is null or length(trim(p_payment_reference)) = 0 then
    raise exception 'MISSING_PAYMENT_REFERENCE: Wymagana jest referencja potwierdzonej płatności';
  end if;

  update public.urgent_intake_requests
  set
    state = 'payment_confirmed',
    payment_reference = trim(p_payment_reference),
    booking_id = p_booking_id,
    version = v_req.version + 1,
    updated_at = v_now
  where id = p_request_id
  returning * into v_req;

  insert into public.urgent_intake_events (
    request_id,
    event_type,
    from_state,
    to_state,
    payload,
    payload_hash,
    idempotency_key
  ) values (
    v_req.id,
    'payment_confirmed',
    'timeslot_proposed',
    'payment_confirmed',
    coalesce(p_payload, '{}'::jsonb),
    p_payload_hash,
    p_idempotency_key
  );

  return v_req;
end;
$$;

create or replace function public.offer_availability_notification(
  p_request_id uuid,
  p_expected_version integer,
  p_offer_expires_at timestamptz,
  p_idempotency_key text,
  p_payload jsonb,
  p_payload_hash text
)
returns public.availability_notification_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_req public.availability_notification_requests%rowtype;
  v_existing_event public.availability_notification_events%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 or length(trim(p_idempotency_key)) > 128 then
    raise exception 'INVALID_IDEMPOTENCY_KEY: Klucz idempotencji jest wymagany i musi mieć od 1 do 128 znaków';
  end if;

  if p_payload_hash is null or length(trim(p_payload_hash)) = 0 then
    raise exception 'INVALID_PAYLOAD_HASH: Hash payloadu jest wymagany';
  end if;

  perform pg_advisory_xact_lock(hashtext('avail_notif_idempotency:' || p_idempotency_key));

  select * into v_existing_event
  from public.availability_notification_events
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing_event.payload_hash <> p_payload_hash then
      raise exception 'IDEMPOTENCY_CONFLICT: Klucz % został już użyty z innym ładunkiem', p_idempotency_key;
    end if;
    if v_existing_event.request_id <> p_request_id then
      raise exception 'IDEMPOTENCY_CONFLICT: Klucz % został użyty dla innego zgłoszenia', p_idempotency_key;
    end if;
    select * into v_req from public.availability_notification_requests where id = p_request_id;
    return v_req;
  end if;

  select * into v_req
  from public.availability_notification_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND: Zgłoszenie % nie istnieje', p_request_id;
  end if;

  if v_req.state in ('accepted_paid', 'expired', 'cancelled', 'consumed') then
    raise exception 'TERMINAL_STATE: Nie można oferować dostępności w stanie %', v_req.state;
  end if;

  if v_now >= v_req.expires_at then
    raise exception 'REQUEST_EXPIRED: Zgłoszenie w kolejce wygasło';
  end if;

  if p_expected_version is not null and v_req.version <> p_expected_version then
    raise exception 'CONCURRENCY_CONFLICT: Oczekiwano wersji %, aktualna %', p_expected_version, v_req.version;
  end if;

  if p_offer_expires_at is null or p_offer_expires_at <= v_now then
    raise exception 'INVALID_OFFER_EXPIRY: Czas wygaśnięcia oferty musi być w przyszłości';
  end if;

  update public.availability_notification_requests
  set
    state = 'offer_sent',
    offered_at = v_now,
    offer_expires_at = p_offer_expires_at,
    version = v_req.version + 1,
    updated_at = v_now
  where id = p_request_id
  returning * into v_req;

  insert into public.availability_notification_events (
    request_id,
    event_type,
    from_state,
    to_state,
    payload,
    payload_hash,
    idempotency_key
  ) values (
    v_req.id,
    'offer_sent',
    'queued',
    'offer_sent',
    coalesce(p_payload, '{}'::jsonb),
    p_payload_hash,
    p_idempotency_key
  );

  return v_req;
end;
$$;

create or replace function public.confirm_notification_offer_payment(
  p_request_id uuid,
  p_expected_version integer,
  p_payment_reference text,
  p_booking_id uuid,
  p_idempotency_key text,
  p_payload jsonb,
  p_payload_hash text
)
returns public.availability_notification_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_req public.availability_notification_requests%rowtype;
  v_existing_event public.availability_notification_events%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 or length(trim(p_idempotency_key)) > 128 then
    raise exception 'INVALID_IDEMPOTENCY_KEY: Klucz idempotencji jest wymagany i musi mieć od 1 do 128 znaków';
  end if;

  if p_payload_hash is null or length(trim(p_payload_hash)) = 0 then
    raise exception 'INVALID_PAYLOAD_HASH: Hash payloadu jest wymagany';
  end if;

  perform pg_advisory_xact_lock(hashtext('avail_notif_idempotency:' || p_idempotency_key));

  select * into v_existing_event
  from public.availability_notification_events
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing_event.payload_hash <> p_payload_hash then
      raise exception 'IDEMPOTENCY_CONFLICT: Klucz % został już użyty z innym ładunkiem', p_idempotency_key;
    end if;
    if v_existing_event.request_id <> p_request_id then
      raise exception 'IDEMPOTENCY_CONFLICT: Klucz % został użyty dla innego zgłoszenia', p_idempotency_key;
    end if;
    select * into v_req from public.availability_notification_requests where id = p_request_id;
    return v_req;
  end if;

  select * into v_req
  from public.availability_notification_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND: Zgłoszenie % nie istnieje', p_request_id;
  end if;

  if v_req.state <> 'offer_sent' then
    raise exception 'INVALID_STATE: Potwierdzenie oferty wymaga stanu offer_sent (aktualny: %)', v_req.state;
  end if;

  if v_req.offer_expires_at is not null and v_now >= v_req.offer_expires_at then
    raise exception 'OFFER_EXPIRED: Oferta dostępności wygasła przed opłaceniem';
  end if;

  if p_expected_version is not null and v_req.version <> p_expected_version then
    raise exception 'CONCURRENCY_CONFLICT: Oczekiwano wersji %, aktualna %', p_expected_version, v_req.version;
  end if;

  if p_payment_reference is null or length(trim(p_payment_reference)) = 0 then
    raise exception 'MISSING_PAYMENT_REFERENCE: Wymagana jest referencja potwierdzonej płatności';
  end if;

  update public.availability_notification_requests
  set
    state = 'accepted_paid',
    payment_reference = trim(p_payment_reference),
    booking_id = p_booking_id,
    accepted_at = v_now,
    version = v_req.version + 1,
    updated_at = v_now
  where id = p_request_id
  returning * into v_req;

  insert into public.availability_notification_events (
    request_id,
    event_type,
    from_state,
    to_state,
    payload,
    payload_hash,
    idempotency_key
  ) values (
    v_req.id,
    'offer_accepted_paid',
    'offer_sent',
    'accepted_paid',
    coalesce(p_payload, '{}'::jsonb),
    p_payload_hash,
    p_idempotency_key
  );

  return v_req;
end;
$$;

create or replace function public.consume_talk_entitlement(
  p_entitlement_id uuid,
  p_call_session_id uuid,
  p_expected_version integer,
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
  v_now timestamptz := timezone('utc', now());
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
    if v_existing_event.entitlement_id <> p_entitlement_id then
      raise exception 'IDEMPOTENCY_CONFLICT: Klucz % został użyty dla innego uprawnienia', p_idempotency_key;
    end if;
    select * into v_ent from public.consultation_talk_entitlements where id = p_entitlement_id;
    return v_ent;
  end if;

  select * into v_ent
  from public.consultation_talk_entitlements
  where id = p_entitlement_id
  for update;

  if not found then
    raise exception 'ENTITLEMENT_NOT_FOUND: Uprawnienie % nie istnieje', p_entitlement_id;
  end if;

  if v_ent.state <> 'active' then
    raise exception 'INVALID_STATE: Zużycie uprawnienia wymaga stanu active (aktualny: %)', v_ent.state;
  end if;

  if v_now < v_ent.valid_from then
    raise exception 'ENTITLEMENT_NOT_YET_VALID: Okno ważności uprawnienia jeszcze się nie rozpoczęło';
  end if;

  if v_now >= v_ent.valid_until then
    raise exception 'ENTITLEMENT_EXPIRED: Uprawnienie do rozmowy wygasło';
  end if;

  if p_expected_version is not null and v_ent.version <> p_expected_version then
    raise exception 'CONCURRENCY_CONFLICT: Oczekiwano wersji %, aktualna %', p_expected_version, v_ent.version;
  end if;

  if p_call_session_id is null then
    raise exception 'MISSING_SESSION_ID: Zużycie uprawnienia wymaga identyfikatora sesji połączenia';
  end if;

  update public.consultation_talk_entitlements
  set
    state = 'consumed',
    consumed_at = v_now,
    consumed_call_session_id = p_call_session_id,
    version = v_ent.version + 1,
    updated_at = v_now
  where id = p_entitlement_id
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
    'entitlement_consumed',
    'active',
    'consumed',
    coalesce(p_payload, '{}'::jsonb),
    p_payload_hash,
    p_idempotency_key
  );

  return v_ent;
end;
$$;

revoke all on function public.propose_urgent_intake_timeslot(uuid, integer, date, text, timestamptz, timestamptz, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.propose_urgent_intake_timeslot(uuid, integer, date, text, timestamptz, timestamptz, text, jsonb, text) to service_role;

revoke all on function public.confirm_urgent_intake_payment(uuid, integer, text, uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.confirm_urgent_intake_payment(uuid, integer, text, uuid, text, jsonb, text) to service_role;

revoke all on function public.offer_availability_notification(uuid, integer, timestamptz, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.offer_availability_notification(uuid, integer, timestamptz, text, jsonb, text) to service_role;

revoke all on function public.confirm_notification_offer_payment(uuid, integer, text, uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.confirm_notification_offer_payment(uuid, integer, text, uuid, text, jsonb, text) to service_role;

revoke all on function public.consume_talk_entitlement(uuid, uuid, integer, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.consume_talk_entitlement(uuid, uuid, integer, text, jsonb, text) to service_role;
