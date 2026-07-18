begin;

create table if not exists public.growth_signups (
  id text primary key,
  email text not null,
  kind text not null check (kind in ('newsletter', 'lead_magnet')),
  lead_magnet_slug text,
  location text,
  source_page text,
  segment text,
  created_at timestamptz not null default timezone('utc', now()),
  welcome_sent_at timestamptz,
  followup_three_sent_at timestamptz,
  followup_seven_sent_at timestamptz
);

alter table public.growth_signups
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists marketing_opt_in_at timestamptz,
  add column if not exists marketing_unsubscribed_at timestamptz,
  add column if not exists unsubscribe_token text;

-- Rekordy istniejące przed tym wdrożeniem nie zawierają udokumentowanej zgody.
-- Zostają bez follow-upów, dopóki odbiorca nie zaznaczy zgody przy kolejnym pobraniu.
update public.growth_signups
set marketing_opt_in = false
where marketing_opt_in_at is null;

create unique index if not exists growth_signups_unsubscribe_token_idx
  on public.growth_signups(unsubscribe_token)
  where unsubscribe_token is not null;
create index if not exists growth_signups_followup_queue_idx
  on public.growth_signups(kind, marketing_opt_in, marketing_unsubscribed_at, created_at);

alter table public.growth_signups enable row level security;
revoke all on table public.growth_signups from anon, authenticated;
grant all on table public.growth_signups to service_role;
drop policy if exists "service role full access growth_signups" on public.growth_signups;
create policy "service role full access growth_signups"
  on public.growth_signups
  for all
  to service_role
  using (true)
  with check (true);

commit;
