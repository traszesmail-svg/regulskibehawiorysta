-- Zapytaj behawiorystę: explicit service identity, live flag and singleton state.
alter table public.bookings
  add column if not exists service_type text not null default 'szybka-konsultacja-15-min',
  add column if not exists live_mode boolean not null default false;

update public.bookings
set service_type = case
  when amount = 104 then 'kwadrans-na-juz'
  when amount = 475 then 'konsultacja-behawioralna-online'
  when amount = 174 then 'konsultacja-30-min'
  else 'szybka-konsultacja-15-min'
end
where service_type is null
   or service_type = ''
   or (service_type = 'szybka-konsultacja-15-min' and amount in (104, 475, 174));

create table if not exists public.zapytaj_live_status (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.zapytaj_live_status enable row level security;
revoke all on table public.zapytaj_live_status from anon, authenticated;
grant select, insert, update, delete on table public.zapytaj_live_status to service_role;
