-- Durable, private case maps for the Mapa sprawy flow.
-- The client never receives direct table access; Next API routes use service role
-- only after validating the Supabase account session.

create table if not exists public.case_maps (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  schema_version text not null,
  status text not null default 'draft' check (status in ('draft', 'completed', 'archived')),
  species text not null check (species in ('pies', 'kot')),
  topic text not null,
  path text not null check (path in ('fast', 'long')),
  source text not null default 'direct' check (source in ('direct', 'problem_page', 'instagram')),
  problem_key text,
  triage_state text not null check (
    triage_state in (
      'SAFETY_NOW',
      'HUMAN_MEDICAL',
      'VET_URGENT',
      'VET_FIRST',
      'SAFETY_PRIORITY',
      'PROCEED'
    )
  ),
  answers jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  current_question_id text,
  consent_version text not null,
  consented_at timestamptz not null,
  marketing_consent boolean not null default false,
  revision integer not null default 1 check (revision > 0),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists case_maps_owner_updated_idx
  on public.case_maps(owner_user_id, updated_at desc);

create index if not exists case_maps_status_updated_idx
  on public.case_maps(status, updated_at desc);

alter table public.case_maps enable row level security;
revoke all on table public.case_maps from anon, authenticated;
grant all on table public.case_maps to service_role;

drop policy if exists "service role full access case_maps" on public.case_maps;
create policy "service role full access case_maps" on public.case_maps
  for all
  to service_role
  using (true)
  with check (true);
