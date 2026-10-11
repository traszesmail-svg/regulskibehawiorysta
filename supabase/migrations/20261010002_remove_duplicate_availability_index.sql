-- The unique constraint already provides the same (booking_date, booking_time) index.
drop index if exists public.availability_date_idx;
