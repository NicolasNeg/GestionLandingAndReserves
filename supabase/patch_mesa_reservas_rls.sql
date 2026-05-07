-- PATCH HOTFIX — mesa_reservas RLS (reserva propia + disponibilidad)

begin;

alter table if exists public.mesa_reservas enable row level security;

-- Disponibilidad publica (solo mesas apartadas) para UX de calendario/mapa.
drop policy if exists "mesa_select_apartadas_public_anon" on public.mesa_reservas;
create policy "mesa_select_apartadas_public_anon" on public.mesa_reservas
for select to anon
using (estado = 'apartada');

drop policy if exists "mesa_select_apartadas_catalogo" on public.mesa_reservas;
create policy "mesa_select_apartadas_catalogo" on public.mesa_reservas
for select to authenticated
using (estado = 'apartada');

-- Propietario de reserva.
drop policy if exists "mesa_select_own" on public.mesa_reservas;
create policy "mesa_select_own" on public.mesa_reservas
for select to authenticated
using (auth.uid() is not null and user_id = auth.uid()::text);

drop policy if exists "mesa_insert_own" on public.mesa_reservas;
create policy "mesa_insert_own" on public.mesa_reservas
for insert to authenticated
with check (auth.uid() is not null and user_id = auth.uid()::text);

drop policy if exists "mesa_update_own" on public.mesa_reservas;
create policy "mesa_update_own" on public.mesa_reservas
for update to authenticated
using (auth.uid() is not null and user_id = auth.uid()::text)
with check (auth.uid() is not null and user_id = auth.uid()::text);

-- Operacion / staff / admin.
drop policy if exists "mesa_select_staff" on public.mesa_reservas;
create policy "mesa_select_staff" on public.mesa_reservas
for select to authenticated
using (
  public.app_has_permission('dashboard.manage')
  or public.app_has_permission('admin.panel')
  or public.app_has_permission('programador.access')
  or public.app_has_permission('tickets.scan')
  or public.app_has_permission('sales.physical')
  or public.app_has_permission('parking.manage')
);

drop policy if exists "mesa_insert_staff" on public.mesa_reservas;
create policy "mesa_insert_staff" on public.mesa_reservas
for insert to authenticated
with check (
  public.app_has_permission('dashboard.manage')
  or public.app_has_permission('admin.panel')
  or public.app_has_permission('programador.access')
  or public.app_has_permission('tickets.scan')
  or public.app_has_permission('sales.physical')
  or public.app_has_permission('parking.manage')
);

drop policy if exists "mesa_update_staff" on public.mesa_reservas;
create policy "mesa_update_staff" on public.mesa_reservas
for update to authenticated
using (
  public.app_has_permission('dashboard.manage')
  or public.app_has_permission('admin.panel')
  or public.app_has_permission('programador.access')
  or public.app_has_permission('tickets.scan')
  or public.app_has_permission('sales.physical')
  or public.app_has_permission('parking.manage')
)
with check (
  public.app_has_permission('dashboard.manage')
  or public.app_has_permission('admin.panel')
  or public.app_has_permission('programador.access')
  or public.app_has_permission('tickets.scan')
  or public.app_has_permission('sales.physical')
  or public.app_has_permission('parking.manage')
);

notify pgrst, 'reload schema';

commit;
