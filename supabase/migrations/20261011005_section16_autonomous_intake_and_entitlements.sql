-- Migration 20261011005_section16_autonomous_intake_and_entitlements.sql
-- Section 16 Stage 1: Durable, privacy-preserving, and idempotent data model
-- for Urgent Intake (today/tomorrow), Availability Notifications ("Powiadom mnie"),
-- and Future Timed Talk Entitlements.

-- 0. DEDICATED SEQUENCE FOR AVAILABILITY NOTIFICATIONS QUEUE
create sequence if not exists public.availability_notification_queue_seq
  as bigint
  start with 1
  increment by 1
  minvalue 1
  no cycle;

revoke all on sequence public.availability_notification_queue_seq from anon, authenticated;
grant usage, select, update on sequence public.availability_notification_queue_seq to service_role;


-- 1. URGENT INTAKE REQUESTS (Path A: Pilna pomoc dziś / jutro)
create table if not exists public.urgent_intake_requests (
  id uuid primary key default gen_random_uuid(),
  day_choice text not null check (day_choice in ('today', 'tomorrow')),
  target_date date not null,
  caller_phone_fingerprint text not null,
  caller_phone_masked text not null,
  contact_ciphertext text check (
    contact_ciphertext is null or (
      length(trim(contact_ciphertext)) >= 16
      and contact_ciphertext like 'enc:%'
      and substring(contact_ciphertext from 5) !~* '([0-9][\s.-]*){9}'
      and substring(contact_ciphertext from 5) !~* '[a-zA-Z0-9_.+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    )
  ),
  client_name text,
  client_notes text,
  state text not null default 'pending_proposal' check (state in ('pending_proposal', 'timeslot_proposed', 'payment_confirmed', 'expired', 'cancelled', 'rejected')),
  proposed_date date,
  proposed_time text check (proposed_time is null or proposed_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  proposed_timeslot_iso timestamptz,
  hold_expires_at timestamptz,
  expires_at timestamptz not null,
  payment_reference text,
  booking_id uuid references public.bookings(id) on delete set null,
  version integer not null default 1 check (version >= 1),
  idempotency_key text not null unique check (length(trim(idempotency_key)) between 1 and 128),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (booking_id is null or state = 'payment_confirmed'),
  check (state <> 'timeslot_proposed' or (proposed_date is not null and proposed_time is not null and hold_expires_at is not null)),
  check (state <> 'payment_confirmed' or payment_reference is not null)
);

create index if not exists urgent_intake_requests_fingerprint_idx
  on public.urgent_intake_requests (caller_phone_fingerprint, created_at desc);

create index if not exists urgent_intake_requests_state_target_idx
  on public.urgent_intake_requests (state, target_date);

create index if not exists urgent_intake_requests_idempotency_key_idx
  on public.urgent_intake_requests (idempotency_key);

create table if not exists public.urgent_intake_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.urgent_intake_requests(id) on delete cascade,
  event_type text not null,
  from_state text check (from_state is null or from_state in ('pending_proposal', 'timeslot_proposed', 'payment_confirmed', 'expired', 'cancelled', 'rejected')),
  to_state text not null check (to_state in ('pending_proposal', 'timeslot_proposed', 'payment_confirmed', 'expired', 'cancelled', 'rejected')),
  payload jsonb not null default '{}'::jsonb,
  payload_hash text not null check (length(trim(payload_hash)) > 0),
  idempotency_key text not null unique check (length(trim(idempotency_key)) between 1 and 128),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists urgent_intake_events_request_idx
  on public.urgent_intake_events (request_id, created_at asc);


-- 2. AVAILABILITY NOTIFICATION REQUESTS (Path B: "Powiadom mnie, gdy właściciel będzie dostępny")
create table if not exists public.availability_notification_requests (
  id uuid primary key default gen_random_uuid(),
  caller_phone_fingerprint text not null,
  caller_phone_masked text not null,
  contact_ciphertext text check (
    contact_ciphertext is null or (
      length(trim(contact_ciphertext)) >= 16
      and contact_ciphertext like 'enc:%'
      and substring(contact_ciphertext from 5) !~* '([0-9][\s.-]*){9}'
      and substring(contact_ciphertext from 5) !~* '[a-zA-Z0-9_.+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    )
  ),
  channel text not null default 'sms' check (channel in ('sms', 'email')),
  client_name text,
  state text not null default 'queued' check (state in ('queued', 'offer_sent', 'accepted_paid', 'expired', 'cancelled', 'consumed')),
  queue_position bigint not null default nextval('public.availability_notification_queue_seq') check (queue_position > 0),
  offered_at timestamptz,
  offer_expires_at timestamptz,
  accepted_at timestamptz,
  payment_reference text,
  booking_id uuid references public.bookings(id) on delete set null,
  expires_at timestamptz not null,
  version integer not null default 1 check (version >= 1),
  idempotency_key text not null unique check (length(trim(idempotency_key)) between 1 and 128),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint availability_notification_requests_queue_position_key unique (queue_position),
  check (booking_id is null or state in ('accepted_paid', 'consumed')),
  check (state <> 'offer_sent' or (offered_at is not null and offer_expires_at is not null)),
  check (state <> 'accepted_paid' or (payment_reference is not null and accepted_at is not null))
);

create index if not exists availability_notification_requests_fingerprint_idx
  on public.availability_notification_requests (caller_phone_fingerprint, created_at desc);

create index if not exists availability_notification_requests_state_queue_idx
  on public.availability_notification_requests (state, queue_position asc);

create index if not exists availability_notification_requests_idempotency_key_idx
  on public.availability_notification_requests (idempotency_key);

create table if not exists public.availability_notification_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.availability_notification_requests(id) on delete cascade,
  event_type text not null,
  from_state text check (from_state is null or from_state in ('queued', 'offer_sent', 'accepted_paid', 'expired', 'cancelled', 'consumed')),
  to_state text not null check (to_state in ('queued', 'offer_sent', 'accepted_paid', 'expired', 'cancelled', 'consumed')),
  payload jsonb not null default '{}'::jsonb,
  payload_hash text not null check (length(trim(payload_hash)) > 0),
  idempotency_key text not null unique check (length(trim(idempotency_key)) between 1 and 128),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists availability_notification_events_request_idx
  on public.availability_notification_events (request_id, created_at asc);


-- 3. CONSULTATION TALK ENTITLEMENTS (Future Timed Talk Entitlement)
create table if not exists public.consultation_talk_entitlements (
  id uuid primary key default gen_random_uuid(),
  caller_phone_fingerprint text not null,
  caller_phone_masked text not null,
  booking_id uuid references public.bookings(id) on delete set null,
  payment_reference text not null,
  urgent_request_id uuid references public.urgent_intake_requests(id) on delete set null,
  notification_request_id uuid references public.availability_notification_requests(id) on delete set null,
  allocated_seconds integer not null default 900 check (allocated_seconds > 0),
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  state text not null default 'active' check (state in ('active', 'consumed', 'expired', 'revoked')),
  consumed_at timestamptz,
  consumed_call_session_id uuid references public.call_sessions(id) on delete set null,
  version integer not null default 1 check (version >= 1),
  idempotency_key text not null unique check (length(trim(idempotency_key)) between 1 and 128),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (valid_until > valid_from),
  check (length(trim(payment_reference)) > 0),
  check (urgent_request_id is not null or notification_request_id is not null or booking_id is not null),
  check (state <> 'consumed' or (consumed_at is not null and consumed_call_session_id is not null))
);

create index if not exists consultation_talk_entitlements_fingerprint_idx
  on public.consultation_talk_entitlements (caller_phone_fingerprint, state);

create index if not exists consultation_talk_entitlements_booking_idx
  on public.consultation_talk_entitlements (booking_id);

create index if not exists consultation_talk_entitlements_idempotency_key_idx
  on public.consultation_talk_entitlements (idempotency_key);

create table if not exists public.consultation_talk_entitlement_events (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.consultation_talk_entitlements(id) on delete cascade,
  event_type text not null,
  from_state text check (from_state is null or from_state in ('active', 'consumed', 'expired', 'revoked')),
  to_state text not null check (to_state in ('active', 'consumed', 'expired', 'revoked')),
  payload jsonb not null default '{}'::jsonb,
  payload_hash text not null check (length(trim(payload_hash)) > 0),
  idempotency_key text not null unique check (length(trim(idempotency_key)) between 1 and 128),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists consultation_talk_entitlement_events_entitlement_idx
  on public.consultation_talk_entitlement_events (entitlement_id, created_at asc);


-- 4. ROW LEVEL SECURITY FAIL-CLOSED CONFIGURATION
alter table public.urgent_intake_requests enable row level security;
alter table public.urgent_intake_events enable row level security;
alter table public.availability_notification_requests enable row level security;
alter table public.availability_notification_events enable row level security;
alter table public.consultation_talk_entitlements enable row level security;
alter table public.consultation_talk_entitlement_events enable row level security;

revoke all on table public.urgent_intake_requests from anon, authenticated;
revoke all on table public.urgent_intake_events from anon, authenticated;
revoke all on table public.availability_notification_requests from anon, authenticated;
revoke all on table public.availability_notification_events from anon, authenticated;
revoke all on table public.consultation_talk_entitlements from anon, authenticated;
revoke all on table public.consultation_talk_entitlement_events from anon, authenticated;

grant select, insert, update on table public.urgent_intake_requests to service_role;
grant select, insert on table public.urgent_intake_events to service_role;
grant select, insert, update on table public.availability_notification_requests to service_role;
grant select, insert on table public.availability_notification_events to service_role;
grant select, insert, update on table public.consultation_talk_entitlements to service_role;
grant select, insert on table public.consultation_talk_entitlement_events to service_role;


-- 5. TRANSACTIONAL RPC FUNCTIONS FOR URGENT INTAKE

create or replace function public.create_urgent_intake_request(
  p_request_id uuid,
  p_day_choice text,
  p_target_date date,
  p_caller_phone_fingerprint text,
  p_caller_phone_masked text,
  p_contact_ciphertext text,
  p_client_name text,
  p_client_notes text,
  p_expires_at timestamptz,
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
  v_today date := (timezone('utc', now()) at time zone 'Europe/Warsaw')::date;
  v_new_id uuid := coalesce(p_request_id, gen_random_uuid());
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
    select * into v_req from public.urgent_intake_requests where id = v_existing_event.request_id;
    return v_req;
  end if;

  if p_day_choice not in ('today', 'tomorrow') then
    raise exception 'INVALID_DAY_CHOICE: Wybór dnia musi wynosić "today" lub "tomorrow"';
  end if;

  if p_day_choice = 'today' and p_target_date <> v_today then
    raise exception 'INVALID_TARGET_DATE: Dla wyboru today data docelowa musi być dzisiejsza w strefie Europe/Warsaw (%)', v_today;
  end if;

  if p_day_choice = 'tomorrow' and p_target_date <> (v_today + 1) then
    raise exception 'INVALID_TARGET_DATE: Dla wyboru tomorrow data docelowa musi być jutrzejsza w strefie Europe/Warsaw (%)', (v_today + 1);
  end if;

  if p_caller_phone_fingerprint is null or length(trim(p_caller_phone_fingerprint)) = 0 then
    raise exception 'INVALID_FINGERPRINT: Wymagany jest fingerprint numeru telefonu';
  end if;

  if p_contact_ciphertext is not null then
    if length(trim(p_contact_ciphertext)) < 16 or p_contact_ciphertext not like 'enc:%'
       or substring(p_contact_ciphertext from 5) ~* '([0-9][\s.-]*){9}'
       or substring(p_contact_ciphertext from 5) ~* '[a-zA-Z0-9_.+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' then
      raise exception 'INVALID_CONTACT_CIPHERTEXT: contact_ciphertext musi mieć prefiks enc:, min. 16 znaków i nie może zawierać jawnego telefonu ani e-maila';
    end if;
  end if;

  if p_expires_at is null or p_expires_at <= timezone('utc', now()) then
    raise exception 'INVALID_EXPIRY: Czas wygaśnięcia musi znajdować się w przyszłości';
  end if;

  insert into public.urgent_intake_requests (
    id,
    day_choice,
    target_date,
    caller_phone_fingerprint,
    caller_phone_masked,
    contact_ciphertext,
    client_name,
    client_notes,
    state,
    expires_at,
    version,
    idempotency_key,
    created_at,
    updated_at
  ) values (
    v_new_id,
    p_day_choice,
    p_target_date,
    p_caller_phone_fingerprint,
    p_caller_phone_masked,
    p_contact_ciphertext,
    p_client_name,
    p_client_notes,
    'pending_proposal',
    p_expires_at,
    1,
    p_idempotency_key,
    timezone('utc', now()),
    timezone('utc', now())
  )
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
    'request_created',
    null,
    'pending_proposal',
    coalesce(p_payload, '{}'::jsonb),
    p_payload_hash,
    p_idempotency_key
  );

  return v_req;
end;
$$;

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

  if v_now > v_req.expires_at then
    update public.urgent_intake_requests
    set state = 'expired', updated_at = v_now, version = v_req.version + 1
    where id = p_request_id;
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

  if v_req.hold_expires_at is not null and v_now > v_req.hold_expires_at then
    update public.urgent_intake_requests
    set state = 'expired', updated_at = v_now, version = v_req.version + 1
    where id = p_request_id;
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


-- 6. TRANSACTIONAL RPC FUNCTIONS FOR AVAILABILITY NOTIFICATIONS

create or replace function public.create_availability_notification_request(
  p_request_id uuid,
  p_caller_phone_fingerprint text,
  p_caller_phone_masked text,
  p_contact_ciphertext text,
  p_channel text,
  p_client_name text,
  p_expires_at timestamptz,
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
  v_new_id uuid := coalesce(p_request_id, gen_random_uuid());
  v_next_pos bigint;
  v_channel text := coalesce(p_channel, 'sms');
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
    select * into v_req from public.availability_notification_requests where id = v_existing_event.request_id;
    return v_req;
  end if;

  if v_channel not in ('sms', 'email') then
    raise exception 'INVALID_CHANNEL: Kanał musi wynosić "sms" lub "email"';
  end if;

  if p_caller_phone_fingerprint is null or length(trim(p_caller_phone_fingerprint)) = 0 then
    raise exception 'INVALID_FINGERPRINT: Wymagany jest fingerprint numeru telefonu';
  end if;

  if p_contact_ciphertext is not null then
    if length(trim(p_contact_ciphertext)) < 16 or p_contact_ciphertext not like 'enc:%'
       or substring(p_contact_ciphertext from 5) ~* '([0-9][\s.-]*){9}'
       or substring(p_contact_ciphertext from 5) ~* '[a-zA-Z0-9_.+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' then
      raise exception 'INVALID_CONTACT_CIPHERTEXT: contact_ciphertext musi mieć prefiks enc:, min. 16 znaków i nie może zawierać jawnego telefonu ani e-maila';
    end if;
  end if;

  if p_expires_at is null or p_expires_at <= timezone('utc', now()) then
    raise exception 'INVALID_EXPIRY: Czas wygaśnięcia musi znajdować się w przyszłości';
  end if;

  -- Monotonic, concurrency-safe, never-reused sequence allocation
  v_next_pos := nextval('public.availability_notification_queue_seq');

  insert into public.availability_notification_requests (
    id,
    caller_phone_fingerprint,
    caller_phone_masked,
    contact_ciphertext,
    channel,
    client_name,
    state,
    queue_position,
    expires_at,
    version,
    idempotency_key,
    created_at,
    updated_at
  ) values (
    v_new_id,
    p_caller_phone_fingerprint,
    p_caller_phone_masked,
    p_contact_ciphertext,
    v_channel,
    p_client_name,
    'queued',
    v_next_pos,
    p_expires_at,
    1,
    p_idempotency_key,
    timezone('utc', now()),
    timezone('utc', now())
  )
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
    'notification_queued',
    null,
    'queued',
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

  if v_now > v_req.expires_at then
    update public.availability_notification_requests
    set state = 'expired', updated_at = v_now, version = v_req.version + 1
    where id = p_request_id;
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

  if v_req.offer_expires_at is not null and v_now > v_req.offer_expires_at then
    update public.availability_notification_requests
    set state = 'expired', updated_at = v_now, version = v_req.version + 1
    where id = p_request_id;
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

create or replace function public.transition_availability_notification_state(
  p_request_id uuid,
  p_target_state text,
  p_expected_version integer,
  p_reason text,
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
  v_old_state text;
  v_now timestamptz := timezone('utc', now());
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 or length(trim(p_idempotency_key)) > 128 then
    raise exception 'INVALID_IDEMPOTENCY_KEY: Klucz idempotencji jest wymagany i musi mieć od 1 do 128 znaków';
  end if;

  if p_payload_hash is null or length(trim(p_payload_hash)) = 0 then
    raise exception 'INVALID_PAYLOAD_HASH: Hash payloadu jest wymagany';
  end if;

  if p_target_state not in ('consumed', 'expired', 'cancelled') then
    raise exception 'INVALID_TARGET_STATE: Dozwolone cele przejścia to: consumed, expired, cancelled';
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

  v_old_state := v_req.state;

  if v_old_state in ('consumed', 'expired', 'cancelled') then
    raise exception 'TERMINAL_STATE: Nie można zmieniać stanu terminalnego %', v_old_state;
  end if;

  if p_expected_version is not null and v_req.version <> p_expected_version then
    raise exception 'CONCURRENCY_CONFLICT: Oczekiwano wersji %, aktualna %', p_expected_version, v_req.version;
  end if;

  if p_target_state = 'consumed' and v_old_state <> 'accepted_paid' then
    raise exception 'ILLEGAL_TRANSITION: Stan consumed jest dozwolony wyłącznie po accepted_paid';
  end if;

  update public.availability_notification_requests
  set
    state = p_target_state,
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


-- 7. TRANSACTIONAL RPC FUNCTIONS FOR TALK ENTITLEMENTS

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
    select * into v_notif_req from public.availability_notification_requests where id = p_notification_request_id;
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

  if v_now > v_ent.valid_until then
    update public.consultation_talk_entitlements
    set state = 'expired', updated_at = v_now, version = v_ent.version + 1
    where id = p_entitlement_id;
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

create or replace function public.revoke_talk_entitlement(
  p_entitlement_id uuid,
  p_expected_version integer,
  p_reason text,
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
    raise exception 'INVALID_STATE: Cofnięcie uprawnienia jest dozwolone wyłącznie w stanie active (aktualny: %)', v_ent.state;
  end if;

  if p_expected_version is not null and v_ent.version <> p_expected_version then
    raise exception 'CONCURRENCY_CONFLICT: Oczekiwano wersji %, aktualna %', p_expected_version, v_ent.version;
  end if;

  update public.consultation_talk_entitlements
  set
    state = 'revoked',
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
    coalesce(p_reason, 'entitlement_revoked'),
    'active',
    'revoked',
    coalesce(p_payload, '{}'::jsonb),
    p_payload_hash,
    p_idempotency_key
  );

  return v_ent;
end;
$$;


-- 8. REVOKE / GRANT PRIVILEGES FOR MUTATING RPCS (FAIL-CLOSED)
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
