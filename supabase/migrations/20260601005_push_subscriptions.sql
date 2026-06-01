create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_role text not null check (user_role in ('owner', 'customer')),
  booking_id uuid references public.bookings(id) on delete cascade,
  customer_email text,
  target_url text not null,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unsubscribed_at timestamptz,
  check (
    (user_role = 'owner' and booking_id is null)
    or
    (user_role = 'customer' and booking_id is not null)
  )
);

create index if not exists push_subscriptions_booking_active_idx
  on public.push_subscriptions(booking_id)
  where unsubscribed_at is null;

create index if not exists push_subscriptions_owner_active_idx
  on public.push_subscriptions(user_role)
  where user_role = 'owner' and unsubscribed_at is null;

alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from anon, authenticated;
grant all on table public.push_subscriptions to service_role;

drop policy if exists "service role full access push_subscriptions" on public.push_subscriptions;
create policy "service role full access push_subscriptions"
  on public.push_subscriptions
  for all
  to service_role
  using (true)
  with check (true);
