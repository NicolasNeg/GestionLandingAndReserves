-- Dirección textual para embed de Google Maps (vista aérea en landing)
alter table public.landing_page
  add column if not exists google_maps_address text not null default '';
