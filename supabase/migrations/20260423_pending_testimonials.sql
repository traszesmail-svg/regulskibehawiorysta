create table if not exists public.pending_testimonials (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  status text not null default 'pending' check (status in ('pending', 'published', 'skipped')),
  display_name text not null,
  email text not null,
  issue_category text not null,
  opinion text not null,
  photo_url text,
  consent_publish boolean not null default false
);

create index if not exists pending_testimonials_created_at_idx on public.pending_testimonials(created_at desc);
create index if not exists pending_testimonials_status_idx on public.pending_testimonials(status, created_at desc);

alter table public.pending_testimonials enable row level security;
revoke all on table public.pending_testimonials from anon, authenticated;
grant all on table public.pending_testimonials to service_role;
drop policy if exists "service role full access" on public.pending_testimonials;
create policy "service role full access" on public.pending_testimonials
  for all
  to service_role
  using (true)
  with check (true);
