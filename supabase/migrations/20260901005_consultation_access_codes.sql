alter table public.bookings
  add column if not exists consultation_access_code_hash text,
  add column if not exists consultation_access_expires_at timestamptz,
  add column if not exists consultation_access_used_at timestamptz;

create index if not exists bookings_consultation_access_idx
  on public.bookings (consultation_access_code_hash)
  where consultation_access_code_hash is not null;
