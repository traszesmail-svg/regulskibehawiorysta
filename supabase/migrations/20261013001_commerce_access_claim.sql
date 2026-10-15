-- Atomic claim for commerce ebook access download
-- Enforces usage count limit, expiration, order and access code validity under row lock
create or replace function public.claim_commerce_access(
  p_order_number text,
  p_access_code text default null,
  p_email text default null
)
returns setof public.lead_bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.lead_bookings%rowtype;
  v_meta jsonb;
  v_product_type text;
  v_status text;
  v_code_status text;
  v_usage_count integer;
  v_usage_limit integer;
  v_expires_at timestamptz;
  v_now timestamptz := timezone('utc', now());
  v_norm_email text;
  v_norm_code text;
begin
  if p_order_number is null or trim(p_order_number) = '' then
    return;
  end if;

  if p_access_code is null or trim(p_access_code) = '' then
    return;
  end if;

  if p_email is null or trim(p_email) = '' then
    return;
  end if;

  select * into v_row
  from public.lead_bookings
  where preferred_slots = trim(p_order_number)
  for update;

  if not found then
    return;
  end if;

  if v_row.admin_notes is null or trim(v_row.admin_notes) = '' then
    return;
  end if;

  begin
    v_meta := v_row.admin_notes::jsonb;
  exception when others then
    return;
  end;

  if coalesce(v_meta->>'commerce', 'false') <> 'true' then
    return;
  end if;

  v_product_type := coalesce(v_meta->>'productType', '');
  if v_product_type <> 'ebook' then
    return;
  end if;

  v_status := coalesce(v_meta->>'status', '');
  if v_status not in ('access_sent', 'paid') then
    return;
  end if;

  v_code_status := coalesce(v_meta->>'accessCodeStatus', '');
  if v_code_status <> 'active' then
    return;
  end if;

  v_norm_code := upper(trim(p_access_code));
  if v_row.calendar_url is null or v_row.calendar_url <> ('commerce-code:' || v_norm_code) then
    return;
  end if;

  v_norm_email := lower(trim(p_email));
  if lower(trim(v_row.email)) <> v_norm_email then
    return;
  end if;

  if v_meta->>'accessCodeExpiresAt' is not null then
    begin
      v_expires_at := (v_meta->>'accessCodeExpiresAt')::timestamptz;
      if v_now > v_expires_at then
        return;
      end if;
    exception when others then
      return;
    end;
  end if;

  v_usage_count := coalesce((v_meta->>'accessCodeUsageCount')::integer, 0);
  v_usage_limit := coalesce((v_meta->>'accessCodeUsageLimit')::integer, 3);

  if v_usage_count >= v_usage_limit then
    return;
  end if;

  v_usage_count := v_usage_count + 1;
  if v_usage_count >= v_usage_limit then
    v_code_status := 'used';
  else
    v_code_status := 'active';
  end if;

  v_meta := jsonb_set(
    jsonb_set(v_meta, '{accessCodeUsageCount}', to_jsonb(v_usage_count)),
    '{accessCodeStatus}',
    to_jsonb(v_code_status)
  );

  update public.lead_bookings
  set
    admin_notes = v_meta::text,
    updated_at = v_now
  where id = v_row.id
  returning * into v_row;

  return next v_row;
end;
$$;

revoke all on function public.claim_commerce_access(text, text, text) from public, anon, authenticated;
grant execute on function public.claim_commerce_access(text, text, text) to service_role;
