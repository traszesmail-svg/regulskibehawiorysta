-- Durable call sessions and idempotent event audit for consultation calls.
-- Additive migration: safe for existing data; no drops, deletes or table rewrites.

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
