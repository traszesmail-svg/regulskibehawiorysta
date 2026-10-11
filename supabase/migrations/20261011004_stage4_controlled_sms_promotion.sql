-- Migration 20261011004_stage4_controlled_sms_promotion.sql
-- Stage 4: Controlled technical SMS promotion gate from caller_sms_preparations to phone_agent_sms_queue.

alter table public.caller_sms_preparations
  add column if not exists promoted_at timestamptz,
  add column if not exists queue_item_id uuid references public.phone_agent_sms_queue(id) on delete set null,
  add column if not exists approval_id text;

-- Extend status check constraint to include 'promoted'
alter table public.caller_sms_preparations
  drop constraint if exists caller_sms_preparations_status_check;

alter table public.caller_sms_preparations
  add constraint caller_sms_preparations_status_check
  check (status in ('prepared', 'do_not_send', 'promoted'));

create unique index if not exists caller_sms_preparations_approval_id_idx
  on public.caller_sms_preparations (approval_id)
  where approval_id is not null;

create index if not exists caller_sms_preparations_promoted_at_idx
  on public.caller_sms_preparations (promoted_at desc)
  where promoted_at is not null;

create index if not exists caller_sms_preparations_queue_item_id_idx
  on public.caller_sms_preparations (queue_item_id)
  where queue_item_id is not null;

grant select, insert, update on table public.caller_sms_preparations to service_role;

-- Atomic PostgreSQL RPC for Stage 4 SMS promotion
create or replace function public.promote_caller_sms_to_queue(
  p_preparation_id uuid,
  p_approval_id text,
  p_phone text,
  p_caller_phone_fingerprint text,
  p_message text,
  p_now timestamptz default timezone('utc', now()),
  p_max_age_seconds integer default 1800,
  p_simulate_boundary_failure boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := coalesce(p_now, timezone('utc', now()));
  v_prep public.caller_sms_preparations%rowtype;
  v_other_prep_id uuid;
  v_existing_queue_item public.phone_agent_sms_queue%rowtype;
  v_queue_item public.phone_agent_sms_queue%rowtype;
  v_recent_count integer;
  v_clean_approval_id text;
  v_clean_phone text;
  v_clean_message text;
begin
  -- 1. Argument validation
  if p_preparation_id is null then
    raise exception 'invalid_argument: preparation_id jest wymagany';
  end if;

  v_clean_approval_id := trim(coalesce(p_approval_id, ''));
  if length(v_clean_approval_id) = 0 or length(v_clean_approval_id) > 128 then
    raise exception 'invalid_argument: approval_id musi mieć 1-128 znaków';
  end if;

  v_clean_phone := trim(coalesce(p_phone, ''));
  if length(v_clean_phone) = 0 then
    raise exception 'invalid_argument: phone jest wymagany';
  end if;

  if p_caller_phone_fingerprint is null or length(trim(p_caller_phone_fingerprint)) = 0 then
    raise exception 'invalid_argument: caller_phone_fingerprint jest wymagany';
  end if;

  v_clean_message := trim(coalesce(p_message, ''));
  if length(v_clean_message) = 0 or length(v_clean_message) > 160 then
    raise exception 'invalid_argument: message musi mieć 1-160 znaków';
  end if;

  -- 2. Concurrency advisory locking
  perform pg_advisory_xact_lock(hashtext('stage4_promo_approval:' || v_clean_approval_id));
  perform pg_advisory_xact_lock(hashtext('stage4_promo_prep:' || p_preparation_id::text));
  perform pg_advisory_xact_lock(hashtext('stage4_promo_fp:' || p_caller_phone_fingerprint));

  -- 3. Row lock on caller_sms_preparations
  select * into v_prep
  from public.caller_sms_preparations
  where id = p_preparation_id
  for update;

  if not found then
    raise exception 'not_found: nie znaleziono rekordu przygotowania SMS o podanym ID';
  end if;

  -- 4. Check if preparation is already promoted (Exact retry vs conflict)
  if v_prep.status = 'promoted' or v_prep.approval_id is not null then
    if v_prep.approval_id = v_clean_approval_id then
      -- Exact retry for same preparation & same approval_id
      select * into v_queue_item
      from public.phone_agent_sms_queue
      where id = v_prep.queue_item_id
         or idempotency_key = ('stage4_promo:' || v_clean_approval_id)
      limit 1;

      if not found then
        raise exception 'queue_item_not_found: brak powiązanego wpisu kolejki dla zatwierdzonego rekordu';
      end if;

      if v_queue_item.message <> v_clean_message then
        raise exception 'idempotency_conflict: niezgodna treść wiadomości dla ponowionego approvalId';
      end if;

      return jsonb_build_object(
        'status', 'retry_matched',
        'is_retry', true,
        'queue_item', row_to_json(v_queue_item),
        'preparation', row_to_json(v_prep)
      );
    else
      raise exception 'already_promoted: rekord przygotowania został już wykorzystany dla innego zatwierdzenia';
    end if;
  end if;

  -- 5. Check if approval_id was already used by another preparation
  select id into v_other_prep_id
  from public.caller_sms_preparations
  where approval_id = v_clean_approval_id
    and id <> p_preparation_id
  limit 1;

  if found then
    raise exception 'idempotency_conflict: approvalId został już użyty dla innego rekordu przygotowania';
  end if;

  -- Also check if phone_agent_sms_queue already has this idempotency_key
  select * into v_existing_queue_item
  from public.phone_agent_sms_queue
  where idempotency_key = ('stage4_promo:' || v_clean_approval_id)
  limit 1;

  if found then
    raise exception 'idempotency_conflict: wpis w kolejce dla podanego approvalId już istnieje';
  end if;

  -- 6. Validate status and action
  if v_prep.status <> 'prepared' or v_prep.action = 'do_not_send' then
    raise exception 'invalid_status: rekord przygotowania nie ma statusu prepared lub ma akcję do_not_send';
  end if;

  -- 7. Validate admissible decision
  if v_prep.decision not in ('unknown_number', 'session_completed', 'callback_window_expired', 'unpaid_booking') then
    raise exception 'inadmissible_decision: decyzja "%" wyklucza wysyłkę wiadomości SMS', v_prep.decision;
  end if;

  -- 8. Validate fingerprint match
  if v_prep.caller_phone_fingerprint is null or v_prep.caller_phone_fingerprint <> p_caller_phone_fingerprint then
    raise exception 'fingerprint_mismatch: niezgodność fingerprintu numeru telefonu z rekordem przygotowania';
  end if;

  -- 9. Validate expiration window
  if v_prep.prepared_at < (v_now - (coalesce(p_max_age_seconds, 1800) || ' seconds')::interval) then
    raise exception 'expired: rekord przygotowania wygasł';
  end if;

  -- 10. Validate message content & target URL
  if not (v_clean_message ~* '\[?test\s+techniczny\]?') then
    raise exception 'invalid_message: treść wiadomości nie zawiera wymaganego oznaczenia kontrolnego testu technicznego';
  end if;

  if v_prep.target_url is null or length(trim(v_prep.target_url)) = 0 then
    raise exception 'missing_target_url: rekord przygotowania nie zawiera adresu docelowego';
  end if;

  if v_prep.target_url <> 'https://regulskibehawiorysta.pl/zapytaj' then
    raise exception 'invalid_target_url: niedozwolony adres docelowy w rekordzie przygotowania';
  end if;

  if position(v_prep.target_url in v_clean_message) = 0 then
    raise exception 'invalid_message: wiadomość musi zawierać oficjalny link docelowy z rekordu przygotowania';
  end if;

  -- 11. Validate 24-hour rate limit on promotions for this phone fingerprint
  select count(*) into v_recent_count
  from public.caller_sms_preparations
  where caller_phone_fingerprint = p_caller_phone_fingerprint
    and status = 'promoted'
    and promoted_at >= (v_now - interval '24 hours')
    and id <> p_preparation_id;

  if v_recent_count > 0 then
    raise exception 'rate_limit_exceeded: limit 1 promowanego SMS na 24h na numer został już wykorzystany';
  end if;

  -- 12. Atomic insert into phone_agent_sms_queue
  insert into public.phone_agent_sms_queue (
    phone,
    message,
    type,
    status,
    scheduled_for,
    created_at,
    idempotency_key
  ) values (
    v_clean_phone,
    v_clean_message,
    'custom',
    'pending',
    v_now,
    v_now,
    'stage4_promo:' || v_clean_approval_id
  )
  returning * into v_queue_item;

  -- Simulated failure point at insert/update boundary for transactional rollback verification
  if p_simulate_boundary_failure then
    raise exception 'simulated_boundary_failure: wymuszony błąd na granicy insert/update';
  end if;

  -- 13. Atomic update caller_sms_preparations
  update public.caller_sms_preparations
  set
    status = 'promoted',
    promoted_at = v_now,
    queue_item_id = v_queue_item.id,
    approval_id = v_clean_approval_id
  where id = v_prep.id
    and status = 'prepared'
  returning * into v_prep;

  if not found then
    raise exception 'concurrency_failure: nie udało się zaktualizować statusu przygotowania SMS';
  end if;

  return jsonb_build_object(
    'status', 'promoted',
    'is_retry', false,
    'queue_item', row_to_json(v_queue_item),
    'preparation', row_to_json(v_prep)
  );
end;
$$;

revoke all on function public.promote_caller_sms_to_queue(uuid, text, text, text, text, timestamptz, integer, boolean) from public, anon, authenticated;
grant execute on function public.promote_caller_sms_to_queue(uuid, text, text, text, text, timestamptz, integer, boolean) to service_role;
