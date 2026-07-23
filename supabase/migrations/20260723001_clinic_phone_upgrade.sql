alter table public.bookings add column if not exists consultation_mode text;
alter table public.bookings drop constraint if exists bookings_consultation_mode_check;
alter table public.bookings add constraint bookings_consultation_mode_check
  check (consultation_mode in ('phone', 'jitsi') or consultation_mode is null);
create index if not exists bookings_consultation_mode_idx on public.bookings(consultation_mode);
