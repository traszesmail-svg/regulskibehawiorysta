-- Keep the notification fingerprint and the booking transition in one
-- transaction. A failed compare-and-set releases the just-created claim.
create or replace function public.reconcile_revolut_payment_notification(
  p_fingerprint text,
  p_booking_id uuid,
  p_amount numeric
)
returns setof public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_claimed_fingerprint text;
  v_now timestamptz := timezone('utc', now());
begin
  if p_fingerprint !~ '^revolut:[0-9a-f]{64}$' then
    raise exception 'Invalid Revolut notification fingerprint';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'Invalid Revolut payment amount';
  end if;

  -- Lock the current row before the final CAS. A concurrent cancellation has
  -- to complete before this update can decide whether the payment is allowed.
  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if not found
    or v_booking.amount <> p_amount
    or v_booking.sms_confirmation_status is not null
    or not (
      (v_booking.booking_status = 'pending' and v_booking.payment_status = 'unpaid')
      or (
        v_booking.booking_status = 'pending_manual_payment'
        and v_booking.payment_status = 'pending_manual_review'
      )
    ) then
    return;
  end if;

  insert into public.revolut_payment_reconciliation_claims (
    notification_fingerprint,
    booking_id,
    amount
  )
  values (p_fingerprint, p_booking_id, p_amount)
  on conflict (notification_fingerprint) do nothing
  returning notification_fingerprint into v_claimed_fingerprint;

  if v_claimed_fingerprint is null then
    return;
  end if;

  update public.bookings b
  set
    booking_status = 'confirmed',
    payment_status = 'paid',
    payment_method = 'manual',
    payment_reference = p_fingerprint,
    paid_at = v_now,
    cancelled_at = null,
    expired_at = null,
    payment_rejected_at = null,
    payment_rejected_reason = null,
    sms_confirmation_status = 'processing',
    sms_confirmation_sent_at = null,
    sms_provider_message_id = null,
    sms_error_code = null,
    sms_error_message = null,
    updated_at = v_now
  where b.id = p_booking_id
    and b.amount = p_amount
    and b.sms_confirmation_status is null
    and (
      (b.booking_status = 'pending' and b.payment_status = 'unpaid')
      or (
        b.booking_status = 'pending_manual_payment'
        and b.payment_status = 'pending_manual_review'
      )
    )
  returning b.* into v_booking;

  if not found then
    delete from public.revolut_payment_reconciliation_claims
    where notification_fingerprint = p_fingerprint
      and booking_id = p_booking_id
      and amount = p_amount;
    return;
  end if;

  update public.availability
  set
    is_booked = true,
    locked_by_booking_id = p_booking_id,
    locked_until = null,
    updated_at = v_now
  where locked_by_booking_id = p_booking_id;

  return next v_booking;
end;
$$;

revoke all on function public.reconcile_revolut_payment_notification(text, uuid, numeric) from public;
revoke all on function public.reconcile_revolut_payment_notification(text, uuid, numeric) from anon, authenticated;
grant execute on function public.reconcile_revolut_payment_notification(text, uuid, numeric) to service_role;
