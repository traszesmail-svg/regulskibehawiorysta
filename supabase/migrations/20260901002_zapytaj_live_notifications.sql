create table if not exists public.zapytaj_live_notifications (
  id uuid primary key default gen_random_uuid(),
  notification_key text not null unique,
  phone text,
  email text,
  channel text not null check (channel in ('sms', 'email')),
  source_page text,
  status text not null default 'subscribed' check (status in ('subscribed', 'notified', 'unsubscribed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  notified_at timestamptz,
  check (
    (channel = 'sms' and phone is not null)
    or
    (channel = 'email' and email is not null)
  )
);

create index if not exists zapytaj_live_notifications_status_idx
  on public.zapytaj_live_notifications(status, created_at);

alter table public.zapytaj_live_notifications enable row level security;
revoke all on table public.zapytaj_live_notifications from anon, authenticated;
grant select, insert, update, delete on table public.zapytaj_live_notifications to service_role;
