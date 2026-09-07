-- Two short follow-up questions become read-only seven days after the
-- consultation summary/recommendation is published.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS questions_expires_at TIMESTAMPTZ;

ALTER TABLE public.lead_bookings
  ADD COLUMN IF NOT EXISTS questions_expires_at TIMESTAMPTZ;

UPDATE public.bookings
SET questions_expires_at = updated_at + INTERVAL '7 days'
WHERE questions_expires_at IS NULL
  AND booking_status = 'done'
  AND service_type IN ('szybka-konsultacja-15-min', 'kwadrans-na-juz', 'konsultacja-30-min')
  AND questions_remaining IS NOT NULL;

CREATE INDEX IF NOT EXISTS bookings_questions_expires_idx
  ON public.bookings (questions_expires_at)
  WHERE questions_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS lead_bookings_questions_expires_idx
  ON public.lead_bookings (questions_expires_at)
  WHERE questions_expires_at IS NOT NULL;
