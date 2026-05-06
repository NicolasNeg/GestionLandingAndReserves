-- OBSOLETO — No ejecutar en producción con sesión Supabase Auth + RLS del proyecto actual.
-- Workaround histórico cuando JWT no poblaba auth.uid() y el cliente anon no pasaba políticas.
-- Conservado solo como referencia; usa políticas en schema.sql y Supabase Auth.

alter table if exists public.users disable row level security;
alter table if exists public.configuracion disable row level security;
alter table if exists public.paquetes disable row level security;
alter table if exists public.productos disable row level security;
alter table if exists public.movimiento_inventarios disable row level security;
alter table if exists public.servicios disable row level security;
alter table if exists public.landing_page disable row level security;
alter table if exists public.descuentos disable row level security;
alter table if exists public.tickets disable row level security;
alter table if exists public.mesa_reservas disable row level security;
