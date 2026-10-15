-- Retire the unused commerce tables introduced by the legacy order model.
-- Current commerce orders are persisted in public.lead_bookings.
-- Production audit on 2026-10-10 found both tables empty and without app callers.
drop table if exists public.access_codes;
drop table if exists public.orders;
