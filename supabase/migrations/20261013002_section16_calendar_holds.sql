-- Migration: 20261013002_section16_calendar_holds.sql
-- Description: Model B shared availability integration between Section 16 urgent requests and public availability calendar
-- Guarantees atomic hold creation, rescheduling without availability gaps, and release on cancel/reject/expire

-- 1. Alter public.availability table to support Section 16 holds
alter table public.availability
  add column if not exists section16_hold_request_id uuid references public.urgent_intake_requests(id) on delete set null,
  add column if not exists section16_hold_expires_at timestamptz;

create index if not exists idx_availability_section16_hold_request
  on public.availability (section16_hold_request_id)
  where section16_hold_request_id is not null;

create index if not exists idx_availability_section16_hold_expires
  on public.availability (section16_hold_expires_at)
  where section16_hold_expires_at is not null;

-- 2. Atomic propose_urgent_intake_timeslot with public availability slot validation & hold
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
  v_slot public.availability%rowtype;
  v_old_state text;
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

  -- Model B: Lock and validate target slot in public availability calendar
  select * into v_slot
  from public.availability
  where booking_date = p_proposed_date and booking_time = p_proposed_time
  for update;

  if not found then
    raise exception 'SLOT_NOT_FOUND: Termin % % nie istnieje w kalendarzu', p_proposed_date, p_proposed_time;
  end if;

  if (p_proposed_date + p_proposed_time::time) at time zone 'Europe/Warsaw' <= v_now then
    raise exception 'SLOT_UNAVAILABLE: Termin % % jest już przeszły', p_proposed_date, p_proposed_time;
  end if;

  if v_slot.is_booked then
    raise exception 'SLOT_UNAVAILABLE: Termin % % jest już zajęty', p_proposed_date, p_proposed_time;
  end if;

  if v_slot.locked_by_booking_id is not null and (v_slot.locked_until is null or v_slot.locked_until > v_now) then
    raise exception 'SLOT_LOCKED: Termin % % jest zablokowany przez inną rezerwację', p_proposed_date, p_proposed_time;
  end if;

  if v_slot.section16_hold_request_id is not null
     and v_slot.section16_hold_request_id <> p_request_id
     and v_slot.section16_hold_expires_at is not null
     and v_slot.section16_hold_expires_at > v_now then
    raise exception 'SLOT_ALREADY_HELD: Termin % % jest objęty aktywną blokadą Sekcji 16', p_proposed_date, p_proposed_time;
  end if;

  -- Reschedule atomicity: release previous slot held by this request
  update public.availability
  set
    section16_hold_request_id = null,
    section16_hold_expires_at = null,
    updated_at = v_now
  where section16_hold_request_id = p_request_id
    and id <> v_slot.id
    and is_booked = false;

  -- Set hold on target slot
  update public.availability
  set
    section16_hold_request_id = p_request_id,
    section16_hold_expires_at = p_hold_expires_at,
    updated_at = v_now
  where id = v_slot.id;

  v_old_state := v_req.state;

  -- Mutate urgent intake request
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
    v_old_state,
    'timeslot_proposed',
    coalesce(p_payload, '{}'::jsonb),
    p_payload_hash,
    p_idempotency_key
  );

  return v_req;
end;
$$;

-- 3. confirm_urgent_intake_payment with availability booking confirmation
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
  v_slot public.availability%rowtype;
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

  -- Validate active hold belonging strictly to this request (no date/time fallback)
  select * into v_slot
  from public.availability
  where section16_hold_request_id = p_request_id
  for update;

  if not found then
    raise exception 'HOLD_NOT_FOUND: Brak aktywnej blokady w kalendarzu dla zgłoszenia %', p_request_id;
  end if;

  if v_slot.booking_date <> v_req.proposed_date or v_slot.booking_time <> v_req.proposed_time then
    raise exception 'SLOT_MISMATCH: Zablokowany termin % % nie zgadza się z terminem zgłoszenia % %',
      v_slot.booking_date, v_slot.booking_time, v_req.proposed_date, v_req.proposed_time;
  end if;

  if v_slot.section16_hold_expires_at is not null and v_slot.section16_hold_expires_at <= v_now then
    raise exception 'HOLD_EXPIRED: Blokada w kalendarzu wygasła przed potwierdzeniem płatności';
  end if;

  if v_slot.is_booked then
    raise exception 'SLOT_UNAVAILABLE: Termin w kalendarzu jest już oznaczony jako zarezerwowany';
  end if;

  -- Mark availability slot booked
  update public.availability
  set
    is_booked = true,
    section16_hold_expires_at = null,
    updated_at = v_now
  where id = v_slot.id;

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

-- 4. transition_urgent_intake_state with hold release on cancel/reject/expire
create or replace function public.transition_urgent_intake_state(
  p_request_id uuid,
  p_target_state text,
  p_expected_version integer,
  p_reason text,
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
  v_old_state text;
  v_now timestamptz := timezone('utc', now());
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 or length(trim(p_idempotency_key)) > 128 then
    raise exception 'INVALID_IDEMPOTENCY_KEY: Klucz idempotencji jest wymagany i musi mieć od 1 do 128 znaków';
  end if;

  if p_payload_hash is null or length(trim(p_payload_hash)) = 0 then
    raise exception 'INVALID_PAYLOAD_HASH: Hash payloadu jest wymagany';
  end if;

  if p_target_state not in ('expired', 'cancelled', 'rejected') then
    raise exception 'INVALID_TARGET_STATE: Dozwolone cele przejścia to: expired, cancelled, rejected';
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

  v_old_state := v_req.state;

  if v_old_state in ('payment_confirmed', 'expired', 'cancelled', 'rejected') then
    raise exception 'TERMINAL_STATE: Nie można zmieniać stanu terminalnego %', v_old_state;
  end if;

  if p_expected_version is not null and v_req.version <> p_expected_version then
    raise exception 'CONCURRENCY_CONFLICT: Oczekiwano wersji %, aktualna %', p_expected_version, v_req.version;
  end if;

  if p_target_state = 'rejected' and v_old_state <> 'pending_proposal' then
    raise exception 'ILLEGAL_TRANSITION: Odrzucenie jest dozwolone wyłącznie ze stanu pending_proposal';
  end if;

  -- Release availability hold on cancel/reject/expire
  update public.availability
  set
    section16_hold_request_id = null,
    section16_hold_expires_at = null,
    updated_at = v_now
  where section16_hold_request_id = p_request_id
    and is_booked = false;

  update public.urgent_intake_requests
  set
    state = p_target_state,
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
    coalesce(p_reason, p_target_state),
    v_old_state,
    p_target_state,
    coalesce(p_payload, '{}'::jsonb),
    p_payload_hash,
    p_idempotency_key
  );

  return v_req;
end;
$$;

-- 5. sweep_expired_section16_records with hold release
create or replace function public.sweep_expired_section16_records(
  p_batch_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_remaining_budget integer;
  v_urgent_count integer := 0;
  v_avail_count integer := 0;
  v_talk_count integer := 0;
  v_total_count integer := 0;

  v_rec_urgent record;
  v_rec_avail record;
  v_rec_talk record;

  v_reason text;
  v_deadline timestamptz;
  v_idempotency_key text;
  v_payload jsonb;
  v_payload_hash text;
begin
  if p_batch_limit is null or p_batch_limit < 1 or p_batch_limit > 500 then
    raise exception 'INVALID_BATCH_LIMIT: Limit batcha musi wynosić od 1 do 500 (otrzymano: %)', p_batch_limit;
  end if;

  v_remaining_budget := p_batch_limit;

  for v_rec_urgent in
    select id, state, version, expires_at, hold_expires_at
    from public.urgent_intake_requests
    where (
      (state = 'pending_proposal' and expires_at <= v_now)
      or (state = 'timeslot_proposed' and (hold_expires_at <= v_now or expires_at <= v_now))
    )
    order by coalesce(hold_expires_at, expires_at) asc, id asc
    limit v_remaining_budget
    for update skip locked
  loop
    if v_rec_urgent.state = 'pending_proposal' then
      v_reason := 'intake_proposal_window_expired';
      v_deadline := v_rec_urgent.expires_at;
    elsif v_rec_urgent.hold_expires_at is not null and v_rec_urgent.hold_expires_at <= v_now then
      v_reason := 'timeslot_hold_expired';
      v_deadline := v_rec_urgent.hold_expires_at;
    else
      v_reason := 'intake_overall_window_expired';
      v_deadline := v_rec_urgent.expires_at;
    end if;

    v_idempotency_key := 'sweep:urgent_intake:' || v_rec_urgent.id || ':v' || v_rec_urgent.version || ':' || v_rec_urgent.state || ':expired';

    if exists (
      select 1 from public.urgent_intake_events where idempotency_key = v_idempotency_key
    ) then
      continue;
    end if;

    v_payload := jsonb_build_object(
      'action', 'sweep_expired',
      'reason', v_reason,
      'requestId', v_rec_urgent.id,
      'fromState', v_rec_urgent.state,
      'toState', 'expired',
      'deadline', v_deadline,
      'expiredAt', v_now
    );

    v_payload_hash := encode(sha256(convert_to(v_payload::text, 'UTF8')), 'hex');

    update public.urgent_intake_requests
    set
      state = 'expired',
      version = v_rec_urgent.version + 1,
      updated_at = v_now
    where id = v_rec_urgent.id;

    -- Release availability hold for expired urgent intake request
    update public.availability
    set
      section16_hold_request_id = null,
      section16_hold_expires_at = null,
      updated_at = v_now
    where section16_hold_request_id = v_rec_urgent.id
      and is_booked = false;

    insert into public.urgent_intake_events (
      request_id,
      event_type,
      from_state,
      to_state,
      payload,
      payload_hash,
      idempotency_key,
      created_at
    ) values (
      v_rec_urgent.id,
      'intake_expired',
      v_rec_urgent.state,
      'expired',
      v_payload,
      v_payload_hash,
      v_idempotency_key,
      v_now
    );

    v_urgent_count := v_urgent_count + 1;
  end loop;

  -- Also release any orphan holds past expiration
  update public.availability
  set
    section16_hold_request_id = null,
    section16_hold_expires_at = null,
    updated_at = v_now
  where section16_hold_expires_at <= v_now
    and is_booked = false;

  v_remaining_budget := v_remaining_budget - v_urgent_count;

  -- 2. availability_notification_requests
  if v_remaining_budget > 0 then
    for v_rec_avail in
      select id, state, version, expires_at, offer_expires_at
      from public.availability_notification_requests
      where (
        (state = 'queued' and expires_at <= v_now)
        or (state = 'offer_sent' and (offer_expires_at <= v_now or expires_at <= v_now))
      )
      order by coalesce(offer_expires_at, expires_at) asc, queue_position asc
      limit v_remaining_budget
      for update skip locked
    loop
      if v_rec_avail.state = 'queued' then
        v_reason := 'queue_window_expired';
        v_deadline := v_rec_avail.expires_at;
      elsif v_rec_avail.offer_expires_at is not null and v_rec_avail.offer_expires_at <= v_now then
        v_reason := 'offer_window_expired';
        v_deadline := v_rec_avail.offer_expires_at;
      else
        v_reason := 'notification_overall_window_expired';
        v_deadline := v_rec_avail.expires_at;
      end if;

      v_idempotency_key := 'sweep:availability_notification:' || v_rec_avail.id || ':v' || v_rec_avail.version || ':' || v_rec_avail.state || ':expired';

      if exists (
        select 1 from public.availability_notification_events where idempotency_key = v_idempotency_key
      ) then
        continue;
      end if;

      v_payload := jsonb_build_object(
        'action', 'sweep_expired',
        'reason', v_reason,
        'requestId', v_rec_avail.id,
        'fromState', v_rec_avail.state,
        'toState', 'expired',
        'deadline', v_deadline,
        'expiredAt', v_now
      );

      v_payload_hash := encode(sha256(convert_to(v_payload::text, 'UTF8')), 'hex');

      update public.availability_notification_requests
      set
        state = 'expired',
        version = v_rec_avail.version + 1,
        updated_at = v_now
      where id = v_rec_avail.id;

      insert into public.availability_notification_events (
        request_id,
        event_type,
        from_state,
        to_state,
        payload,
        payload_hash,
        idempotency_key,
        created_at
      ) values (
        v_rec_avail.id,
        'offer_expired',
        v_rec_avail.state,
        'expired',
        v_payload,
        v_payload_hash,
        v_idempotency_key,
        v_now
      );

      v_avail_count := v_avail_count + 1;
    end loop;

    v_remaining_budget := v_remaining_budget - v_avail_count;
  end if;

  -- 3. consultation_talk_entitlements
  if v_remaining_budget > 0 then
    for v_rec_talk in
      select id, state, version, valid_until
      from public.consultation_talk_entitlements
      where state = 'active' and valid_until <= v_now
      order by valid_until asc, id asc
      limit v_remaining_budget
      for update skip locked
    loop
      v_reason := 'talk_entitlement_validity_expired';
      v_deadline := v_rec_talk.valid_until;

      v_idempotency_key := 'sweep:talk_entitlement:' || v_rec_talk.id || ':v' || v_rec_talk.version || ':active:expired';

      if exists (
        select 1 from public.consultation_talk_entitlement_events where idempotency_key = v_idempotency_key
      ) then
        continue;
      end if;

      v_payload := jsonb_build_object(
        'action', 'sweep_expired',
        'reason', v_reason,
        'entitlementId', v_rec_talk.id,
        'fromState', 'active',
        'toState', 'expired',
        'deadline', v_deadline,
        'expiredAt', v_now
      );

      v_payload_hash := encode(sha256(convert_to(v_payload::text, 'UTF8')), 'hex');

      update public.consultation_talk_entitlements
      set
        state = 'expired',
        version = v_rec_talk.version + 1,
        updated_at = v_now
      where id = v_rec_talk.id;

      insert into public.consultation_talk_entitlement_events (
        entitlement_id,
        event_type,
        from_state,
        to_state,
        payload,
        payload_hash,
        idempotency_key,
        created_at
      ) values (
        v_rec_talk.id,
        'entitlement_expired',
        'active',
        'expired',
        v_payload,
        v_payload_hash,
        v_idempotency_key,
        v_now
      );

      v_talk_count := v_talk_count + 1;
    end loop;
  end if;

  v_total_count := v_urgent_count + v_avail_count + v_talk_count;

  return jsonb_build_object(
    'urgent_intakes_expired', v_urgent_count,
    'availability_notifications_expired', v_avail_count,
    'talk_entitlements_expired', v_talk_count,
    'total_expired', v_total_count,
    'batch_limit', p_batch_limit,
    'swept_at', v_now
  );
end;
$$;

-- 6. Strict append-only ACL permissions (minimal privilege principles)
revoke all on function public.propose_urgent_intake_timeslot(uuid, integer, date, text, timestamptz, timestamptz, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.propose_urgent_intake_timeslot(uuid, integer, date, text, timestamptz, timestamptz, text, jsonb, text) to service_role;

revoke all on function public.confirm_urgent_intake_payment(uuid, integer, text, uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.confirm_urgent_intake_payment(uuid, integer, text, uuid, text, jsonb, text) to service_role;

revoke all on function public.transition_urgent_intake_state(uuid, text, integer, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.transition_urgent_intake_state(uuid, text, integer, text, text, jsonb, text) to service_role;

revoke all on function public.sweep_expired_section16_records(integer) from public, anon, authenticated;
grant execute on function public.sweep_expired_section16_records(integer) to service_role;
