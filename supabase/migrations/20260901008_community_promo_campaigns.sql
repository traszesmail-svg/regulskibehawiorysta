-- Add a separate paid community campaign variant without changing existing clinic codes.
alter table public.promo_campaigns
  add column if not exists campaign_kind text not null default 'clinic',
  add column if not exists promotion_price numeric(10,2) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'promo_campaigns_campaign_kind_check'
      and conrelid = 'public.promo_campaigns'::regclass
  ) then
    alter table public.promo_campaigns
      add constraint promo_campaigns_campaign_kind_check
      check (campaign_kind in ('clinic', 'community'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'promo_campaigns_promotion_price_check'
      and conrelid = 'public.promo_campaigns'::regclass
  ) then
    alter table public.promo_campaigns
      add constraint promo_campaigns_promotion_price_check
      check (
        (campaign_kind = 'clinic' and promotion_price = 0)
        or (campaign_kind = 'community' and promotion_price = 39.99)
      );
  end if;
end $$;

alter table public.promo_redemptions
  add column if not exists campaign_kind text not null default 'clinic';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'promo_redemptions_campaign_kind_check'
      and conrelid = 'public.promo_redemptions'::regclass
  ) then
    alter table public.promo_redemptions
      add constraint promo_redemptions_campaign_kind_check
      check (campaign_kind in ('clinic', 'community'));
  end if;
end $$;

create unique index if not exists promo_redemptions_community_campaign_email_active_idx
  on public.promo_redemptions(campaign_id, lower(customer_email))
  where campaign_kind = 'community' and released_at is null;
