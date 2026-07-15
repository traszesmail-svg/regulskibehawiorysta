alter table public.case_maps
  add column if not exists booking_id uuid references public.bookings(id) on delete set null,
  add column if not exists shared_with_consultant_at timestamptz,
  add column if not exists reviewed_at timestamptz;

create index if not exists case_maps_booking_idx
  on public.case_maps(booking_id);

create index if not exists case_maps_shared_review_idx
  on public.case_maps(shared_with_consultant_at desc)
  where shared_with_consultant_at is not null;
