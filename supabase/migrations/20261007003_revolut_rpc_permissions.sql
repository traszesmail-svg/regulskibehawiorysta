-- Supabase can explicitly grant API roles access to new public functions.
-- Keep payment reconciliation callable only with the server-side service role.
revoke all on function public.claim_revolut_payment_notification(text, uuid, numeric)
  from public, anon, authenticated;
revoke all on function public.reconcile_revolut_payment_notification(text, uuid, numeric)
  from public, anon, authenticated;

grant execute on function public.claim_revolut_payment_notification(text, uuid, numeric)
  to service_role;
grant execute on function public.reconcile_revolut_payment_notification(text, uuid, numeric)
  to service_role;
