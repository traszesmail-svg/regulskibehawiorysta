-- Store the one material selected by the specialist after a paid conversation.
-- The slug is validated in the admin/API layer against the active catalog.
alter table public.bookings
  add column if not exists recommended_material_slug text;

create index if not exists bookings_recommended_material_idx
  on public.bookings (recommended_material_slug)
  where recommended_material_slug is not null;
