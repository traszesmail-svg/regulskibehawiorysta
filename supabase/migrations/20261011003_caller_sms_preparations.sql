-- Caller SMS generation, idempotency and 24h rate limiting (Stage 3).

create table if not exists public.caller_sms_preparations (
  id uuid primary key default gen_random_uuid(),
  caller_phone_fingerprint text not null,
  caller_phone_masked text not null,
  decision text not null check (decision in (
    'eligible_callback',
    'session_in_progress',
    'paid_booking_no_session',
    'unpaid_booking',
    'unknown_number',
    'session_completed',
    'callback_window_expired',
    'ambiguous_match',
    'invalid_phone',
    'missing_secret',
    'store_error',
    'audit_error',
    'idempotency_conflict'
  )),
  action text not null check (action in ('send', 'do_not_send')),
  status text not null check (status in ('prepared', 'do_not_send')),
  message text check (message is null or (length(message) > 0 and length(message) <= 160)),
  target_url text check (target_url is null or (length(target_url) > 0 and length(target_url) <= 256)),
  rejection_reason text check (rejection_reason is null or length(rejection_reason) <= 512),
  idempotency_key text unique check (idempotency_key is null or (length(trim(idempotency_key)) > 0 and length(idempotency_key) <= 128)),
  request_hash text not null check (length(request_hash) >= 16),
  payload_hash text not null check (length(payload_hash) >= 16),
  prepared_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists caller_sms_preparations_fingerprint_idx
  on public.caller_sms_preparations (caller_phone_fingerprint, prepared_at desc);

create index if not exists caller_sms_preparations_idempotency_key_idx
  on public.caller_sms_preparations (idempotency_key);

create index if not exists caller_sms_preparations_created_at_idx
  on public.caller_sms_preparations (created_at desc);

alter table public.caller_sms_preparations enable row level security;
revoke all on table public.caller_sms_preparations from anon, authenticated;
grant select, insert on table public.caller_sms_preparations to service_role;

-- Atomic RPC function for durable 1/24h rate limiting and idempotency
create or replace function public.prepare_caller_sms(
  p_caller_phone_fingerprint text,
  p_caller_phone_masked text,
  p_decision text,
  p_action text,
  p_status text,
  p_message text,
  p_target_url text,
  p_rejection_reason text,
  p_idempotency_key text,
  p_request_hash text,
  p_payload_hash text,
  p_now timestamptz default timezone('utc', now())
)
returns public.caller_sms_preparations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := coalesce(p_now, timezone('utc', now()));
  v_existing public.caller_sms_preparations;
  v_recent_count integer;
  v_result public.caller_sms_preparations;
begin
  if p_idempotency_key is not null and length(trim(p_idempotency_key)) > 0 then
    perform pg_advisory_xact_lock(hashtext('caller_sms_idempotency:' || p_idempotency_key));

    select * into v_existing
    from public.caller_sms_preparations
    where idempotency_key = p_idempotency_key;

    if found then
      if v_existing.request_hash = p_request_hash then
        return v_existing;
      else
        raise exception 'idempotency_conflict: klucz został użyty dla innego żądania';
      end if;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext('caller_sms_fingerprint:' || p_caller_phone_fingerprint));

  if p_status = 'prepared' then
    select count(*) into v_recent_count
    from public.caller_sms_preparations
    where caller_phone_fingerprint = p_caller_phone_fingerprint
      and status = 'prepared'
      and prepared_at >= (v_now - interval '24 hours');

    if v_recent_count > 0 then
      insert into public.caller_sms_preparations (
        caller_phone_fingerprint,
        caller_phone_masked,
        decision,
        action,
        status,
        message,
        target_url,
        rejection_reason,
        idempotency_key,
        request_hash,
        payload_hash,
        prepared_at,
        created_at
      ) values (
        p_caller_phone_fingerprint,
        p_caller_phone_masked,
        p_decision,
        'do_not_send',
        'do_not_send',
        null,
        null,
        'rate_limit_exceeded: limit 1 SMS na 24h osiągnięty',
        p_idempotency_key,
        p_request_hash,
        p_payload_hash,
        v_now,
        v_now
      )
      returning * into v_result;

      return v_result;
    end if;
  end if;

  insert into public.caller_sms_preparations (
    caller_phone_fingerprint,
    caller_phone_masked,
    decision,
    action,
    status,
    message,
    target_url,
    rejection_reason,
    idempotency_key,
    request_hash,
    payload_hash,
    prepared_at,
    created_at
  ) values (
    p_caller_phone_fingerprint,
    p_caller_phone_masked,
    p_decision,
    p_action,
    p_status,
    p_message,
    p_target_url,
    p_rejection_reason,
    p_idempotency_key,
    p_request_hash,
    p_payload_hash,
    v_now,
    v_now
  )
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.prepare_caller_sms(text, text, text, text, text, text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.prepare_caller_sms(text, text, text, text, text, text, text, text, text, text, text, timestamptz) to service_role;
