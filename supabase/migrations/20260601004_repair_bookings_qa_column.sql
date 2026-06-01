alter table public.bookings
  add column if not exists qa_booking boolean not null default false;

update public.bookings
set qa_booking = false
where qa_booking is null;

create index if not exists bookings_qa_booking_idx on public.bookings(qa_booking);
