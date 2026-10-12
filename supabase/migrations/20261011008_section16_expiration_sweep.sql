-- Migration 20261011008_section16_expiration_sweep.sql
-- Section 16 Stage 5: Atomic, bounded, idempotent periodic expiration sweep
-- for Section 16 expired records:
-- 1. urgent_intake_requests:
--    - pending_proposal when expires_at <= now
--    - timeslot_proposed when hold_expires_at <= now or expires_at <= now
-- 2. availability_notification_requests:
--    - queued when expires_at <= now
--    - offer_sent when offer_expires_at <= now or expires_at <= now
-- 3. consultation_talk_entitlements:
--    - active when valid_until <= now
--
-- Protected states (payment_confirmed, accepted_paid, consumed, cancelled, rejected, revoked, expired)
-- are NEVER swept.
-- Strict concurrency protection via FOR UPDATE SKIP LOCKED.
-- Atomic state update with exactly one audit event per actual transition.
-- Service-role-only access control (revoked from public, anon, authenticated).

create or replace function public.sweep_expired_section16_records(
  p_batch_limit integer default 100,
  p_now timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := coalesce(p_now, timezone('utc', now()));
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
  -- 1. Validate batch limit fail-closed (1..500)
  if p_batch_limit is null or p_batch_limit < 1 or p_batch_limit > 500 then
    raise exception 'INVALID_BATCH_LIMIT: Limit batcha musi wynosić od 1 do 500 (otrzymano: %)', p_batch_limit;
  end if;

  v_remaining_budget := p_batch_limit;

  -- 2. Sweep urgent_intake_requests
  -- Eligible:
  -- - pending_proposal when expires_at <= v_now
  -- - timeslot_proposed when hold_expires_at <= v_now or expires_at <= v_now
  -- Protected: payment_confirmed, expired, cancelled, rejected (never swept)
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

  v_remaining_budget := v_remaining_budget - v_urgent_count;

  -- 3. Sweep availability_notification_requests
  -- Eligible:
  -- - queued when expires_at <= v_now
  -- - offer_sent when offer_expires_at <= v_now or expires_at <= v_now
  -- Protected: accepted_paid, consumed, expired, cancelled (never swept)
  if v_remaining_budget > 0 then
    for v_rec_avail in
      select id, state, version, expires_at, offer_expires_at
      from public.availability_notification_requests
      where (
        (state = 'queued' and expires_at <= v_now)
        or (state = 'offer_sent' and (offer_expires_at <= v_now or expires_at <= v_now))
      )
      order by coalesce(offer_expires_at, expires_at) asc, id asc
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
        'notification_expired',
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

  -- 4. Sweep consultation_talk_entitlements
  -- Eligible:
  -- - active when valid_until <= v_now
  -- Protected: consumed, expired, revoked (never swept)
  if v_remaining_budget > 0 then
    for v_rec_talk in
      select id, state, version, valid_until
      from public.consultation_talk_entitlements
      where (state = 'active' and valid_until <= v_now)
      order by valid_until asc, id asc
      limit v_remaining_budget
      for update skip locked
    loop
      v_reason := 'validity_window_expired';
      v_deadline := v_rec_talk.valid_until;

      v_idempotency_key := 'sweep:talk_entitlement:' || v_rec_talk.id || ':v' || v_rec_talk.version || ':' || v_rec_talk.state || ':expired';

      if exists (
        select 1 from public.consultation_talk_entitlement_events where idempotency_key = v_idempotency_key
      ) then
        continue;
      end if;

      v_payload := jsonb_build_object(
        'action', 'sweep_expired',
        'reason', v_reason,
        'entitlementId', v_rec_talk.id,
        'fromState', v_rec_talk.state,
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
        v_rec_talk.state,
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

revoke all on function public.sweep_expired_section16_records(integer, timestamptz) from public, anon, authenticated;
grant execute on function public.sweep_expired_section16_records(integer, timestamptz) to service_role;
