-- =============================================================================
-- Patch incremental: public.ticket_types (producción)
-- Idempotente. No borra datos. No modifica otras tablas.
-- Requiere funciones public.app_has_permission (Fase 5C).
-- =============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text not null default '',
  incluye text not null default '',
  precio numeric(10,2) not null default 0,
  categoria text not null default '',
  orden int not null default 0,
  activo boolean not null default true,
  especial boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Evolución segura si la tabla ya existía con menos columnas
alter table public.ticket_types add column if not exists nombre text;
alter table public.ticket_types add column if not exists descripcion text;
alter table public.ticket_types add column if not exists incluye text;
alter table public.ticket_types add column if not exists precio numeric(10,2);
alter table public.ticket_types add column if not exists categoria text;
alter table public.ticket_types add column if not exists orden int;
alter table public.ticket_types add column if not exists activo boolean;
alter table public.ticket_types add column if not exists especial boolean;
alter table public.ticket_types add column if not exists metadata jsonb;
alter table public.ticket_types add column if not exists created_at timestamptz;
alter table public.ticket_types add column if not exists updated_at timestamptz;

-- Valores por defecto / NOT NULL donde aplique (no destructivo)
alter table public.ticket_types alter column descripcion set default '';
alter table public.ticket_types alter column incluye set default '';
alter table public.ticket_types alter column precio set default 0;
alter table public.ticket_types alter column categoria set default '';
alter table public.ticket_types alter column orden set default 0;
alter table public.ticket_types alter column activo set default true;
alter table public.ticket_types alter column especial set default false;
alter table public.ticket_types alter column metadata set default '{}'::jsonb;
alter table public.ticket_types alter column created_at set default now();
alter table public.ticket_types alter column updated_at set default now();

update public.ticket_types set nombre = '' where nombre is null;
update public.ticket_types set descripcion = '' where descripcion is null;
update public.ticket_types set incluye = '' where incluye is null;
update public.ticket_types set precio = 0 where precio is null;
update public.ticket_types set categoria = '' where categoria is null;
update public.ticket_types set orden = 0 where orden is null;
update public.ticket_types set activo = true where activo is null;
update public.ticket_types set especial = false where especial is null;
update public.ticket_types set metadata = '{}'::jsonb where metadata is null;
update public.ticket_types set created_at = now() where created_at is null;
update public.ticket_types set updated_at = now() where updated_at is null;

alter table public.ticket_types alter column nombre set not null;
alter table public.ticket_types alter column descripcion set not null;
alter table public.ticket_types alter column incluye set not null;
alter table public.ticket_types alter column precio set not null;
alter table public.ticket_types alter column categoria set not null;
alter table public.ticket_types alter column orden set not null;
alter table public.ticket_types alter column activo set not null;
alter table public.ticket_types alter column especial set not null;
alter table public.ticket_types alter column metadata set not null;
alter table public.ticket_types alter column created_at set not null;
alter table public.ticket_types alter column updated_at set not null;

alter table public.ticket_types enable row level security;

drop policy if exists "ticket_types_select_public" on public.ticket_types;
create policy "ticket_types_select_public" on public.ticket_types
  for select
  using (activo = true);

drop policy if exists "ticket_types_select_staff" on public.ticket_types;
create policy "ticket_types_select_staff" on public.ticket_types
  for select
  to authenticated
  using (
    public.app_has_permission('admin.panel')
    or public.app_has_permission('packages.manage')
    or public.app_has_permission('programador.access')
  );

drop policy if exists "ticket_types_insert_staff" on public.ticket_types;
create policy "ticket_types_insert_staff" on public.ticket_types
  for insert
  to authenticated
  with check (
    public.app_has_permission('admin.panel')
    or public.app_has_permission('packages.manage')
    or public.app_has_permission('programador.access')
  );

drop policy if exists "ticket_types_update_staff" on public.ticket_types;
create policy "ticket_types_update_staff" on public.ticket_types
  for update
  to authenticated
  using (
    public.app_has_permission('admin.panel')
    or public.app_has_permission('packages.manage')
    or public.app_has_permission('programador.access')
  )
  with check (
    public.app_has_permission('admin.panel')
    or public.app_has_permission('packages.manage')
    or public.app_has_permission('programador.access')
  );

drop policy if exists "ticket_types_delete_staff" on public.ticket_types;
create policy "ticket_types_delete_staff" on public.ticket_types
  for delete
  to authenticated
  using (
    public.app_has_permission('admin.panel')
    or public.app_has_permission('packages.manage')
    or public.app_has_permission('programador.access')
  );

-- Seeds mínimos solo si la tabla está vacía (no insertar si ya hay cualquier ticket_type)
insert into public.ticket_types (nombre, descripcion, incluye, precio, categoria, orden, activo, especial)
select v.nombre, v.descripcion, v.incluye, v.precio, v.categoria, v.orden, v.activo, v.especial
from (
  values
    (
      'Adulto general'::text,
      'Entrada general para adulto. Ajusta el precio desde el panel si es necesario.'::text,
      'Acceso general al parque según operación del día.'::text,
      0::numeric,
      'general'::text,
      1::int,
      true::boolean,
      false::boolean
    ),
    (
      'Niño general'::text,
      'Entrada general para niño. Ajusta el precio desde el panel si es necesario.'::text,
      'Acceso general al parque para menores según políticas del parque.'::text,
      0::numeric,
      'general'::text,
      2::int,
      true::boolean,
      false::boolean
    ),
    (
      'Adulto mayor'::text,
      'Entrada general para adulto mayor. Ajusta el precio desde el panel si es necesario.'::text,
      'Acceso general al parque con tarifa adulto mayor.'::text,
      0::numeric,
      'general'::text,
      3::int,
      true::boolean,
      false::boolean
    )
) as v(nombre, descripcion, incluye, precio, categoria, orden, activo, especial)
where not exists (select 1 from public.ticket_types limit 1);

notify pgrst, 'reload schema';
