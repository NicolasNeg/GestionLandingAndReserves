-- Supabase schema base for GestionLandingAndReserves
-- Run in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id text primary key,
  nombre text,
  email text,
  rol text not null default 'cliente',
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists avatar_url text;

-- Permisos por rol (opcional; si está vacío se usan DEFAULT_ROLE_PERMISSIONS en código)
create table if not exists public.role_permissions (
  role text not null,
  permission text not null,
  primary key (role, permission)
);

alter table public.role_permissions add column if not exists created_at timestamptz not null default now();

create table if not exists public.configuracion (
  id text primary key,
  precio_adulto numeric(10,2) not null default 0,
  precio_nino numeric(10,2) not null default 0,
  precio_mayor numeric(10,2) not null default 0
);

create table if not exists public.paquetes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text not null default '',
  precio_base numeric(10,2) not null default 0,
  incluye_personas int not null default 1,
  activo boolean not null default true
);

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text not null default '',
  imagen_url text not null default '',
  precio numeric(10,2) not null default 0,
  stock_actual int not null default 0,
  reservado_aprox int not null default 0,
  activo boolean not null default true,
  fecha_creacion timestamptz not null default now()
);

create table if not exists public.movimiento_inventarios (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  tipo text not null,
  cantidad int not null,
  nota text not null default '',
  creado_por text references public.users(id) on delete set null,
  fecha_creacion timestamptz not null default now()
);

create table if not exists public.servicios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text not null default '',
  imagen_url text not null default '',
  precio numeric(10,2) not null default 0,
  orden int not null default 0,
  activo boolean not null default true
);

create table if not exists public.landing_page (
  id text primary key,
  descripcion_parque text not null default '',
  mapa_distribucion_json text not null default '{}',
  mapa_mesas_json text not null default '{}',
  mapa_estacionamiento_json text not null default '{}',
  imagen_satelital_url text not null default '',
  google_maps_url text not null default '',
  horarios_texto text not null default '',
  abierto_ahora boolean not null default true,
  ocupacion_texto text not null default '',
  estacionamiento_texto text not null default '',
  botones_json text not null default '[]'
);

create table if not exists public.descuentos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descuento numeric(10,2) not null default 0,
  tipo text not null check (tipo in ('monto', 'porcentaje')),
  usos_restantes int not null default 1,
  activo boolean not null default true,
  reglas_json jsonb not null default '[]'::jsonb
);

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

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.users(id) on delete set null,
  cliente_nombre text not null,
  cliente_email text not null,
  metodo_pago text not null,
  estado_pago text not null,
  estado_ticket text not null,
  precio_total numeric(10,2) not null default 0,
  fecha_creacion timestamptz not null default now(),
  fecha_escaneo timestamptz
);

create table if not exists public.ticket_scans (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets(id) on delete set null,
  scanned_by text references public.users(id) on delete set null,
  scanned_at timestamptz not null default now(),
  device_id text,
  mode text not null default 'online',
  result text not null default 'valid',
  raw_qr text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mesa_reservas (
  id uuid primary key default gen_random_uuid(),
  fecha_dia text not null,
  map_item_id text not null,
  estado text not null,
  ticket_id uuid references public.tickets(id) on delete set null,
  user_id text references public.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  mesa_label text,
  mesa_zona text,
  mesa_capacidad integer,
  mesa_precio numeric(12,2),
  extras_json text,
  subtotal_mesa numeric(12,2),
  total_extras numeric(12,2),
  total_reserva numeric(12,2),
  estado_pago text,
  metodo_pago text,
  notas_cliente text
);

create index if not exists idx_mesa_reservas_fecha_item on public.mesa_reservas(fecha_dia, map_item_id);

-- Una mesa solo puede estar apartada una vez por día (bloqueo para mapa / realtime).
create unique index if not exists uq_mesa_reservas_apartada_dia_item
  on public.mesa_reservas (fecha_dia, map_item_id)
  where (estado = 'apartada');

-- Migración suave para bases ya creadas sin columnas Fase 4B
alter table public.mesa_reservas add column if not exists mesa_label text;
alter table public.mesa_reservas add column if not exists mesa_zona text;
alter table public.mesa_reservas add column if not exists mesa_capacidad integer;
alter table public.mesa_reservas add column if not exists mesa_precio numeric(12,2);
alter table public.mesa_reservas add column if not exists extras_json text;
alter table public.mesa_reservas add column if not exists subtotal_mesa numeric(12,2);
alter table public.mesa_reservas add column if not exists total_extras numeric(12,2);
alter table public.mesa_reservas add column if not exists total_reserva numeric(12,2);
alter table public.mesa_reservas add column if not exists estado_pago text;
alter table public.mesa_reservas add column if not exists metodo_pago text;
alter table public.mesa_reservas add column if not exists notas_cliente text;

alter table public.users enable row level security;
alter table public.configuracion enable row level security;
alter table public.paquetes enable row level security;
alter table public.productos enable row level security;
alter table public.movimiento_inventarios enable row level security;
alter table public.servicios enable row level security;
alter table public.landing_page enable row level security;
alter table public.descuentos enable row level security;
alter table public.ticket_types enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_scans enable row level security;
alter table public.mesa_reservas enable row level security;

-- Estacionamiento en tiempo real (UI sync)
create table if not exists public.parking_spots (
  id text primary key,
  x double precision not null default 20,
  y double precision not null default 20,
  estado text not null default 'libre',
  tipo_vehiculo text not null default '',
  placas text not null default '',
  modelo text not null default '',
  reservado_por text not null default '',
  ubicacion text not null default 'patio',
  updated_at timestamptz not null default now()
);

create index if not exists idx_parking_spots_updated on public.parking_spots(updated_at desc);

alter table public.parking_spots enable row level security;

-- Paleta global / marquee
create table if not exists public.app_theme (
  id text primary key default 'global',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_theme (id, payload) values ('global', '{}'::jsonb)
  on conflict (id) do nothing;

alter table public.app_theme enable row level security;

-- =============================================================================
-- Fase 5C — Funciones de permiso (SECURITY DEFINER, search_path fijo)
-- =============================================================================

create or replace function public.app_is_role_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()::text and u.rol in ('jefe', 'programador')
  );
$$;

create or replace function public.app_has_permission(p_perm text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  u_rol text;
  extra jsonb;
  elem text;
begin
  if auth.uid() is null then
    return false;
  end if;
  select rol, permissions into u_rol, extra
  from public.users where id = auth.uid()::text;
  if not found then
    return false;
  end if;
  if u_rol = 'programador' then
    return true;
  end if;
  if extra is not null then
    for elem in select jsonb_array_elements_text(coalesce(extra, '[]'::jsonb))
    loop
      if elem = p_perm then return true; end if;
    end loop;
  end if;
  return exists (
    select 1 from public.role_permissions rp
    where rp.role = u_rol and rp.permission = p_perm
  );
end;
$$;

revoke all on function public.app_has_permission(text) from public;
grant execute on function public.app_has_permission(text) to authenticated;

revoke all on function public.app_is_role_manager() from public;
grant execute on function public.app_is_role_manager() to authenticated;

create or replace function public.scan_ticket(
  p_ticket_id text,
  p_raw_qr text default '',
  p_device_id text default null,
  p_offline_local_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket_uuid uuid;
  v_ticket public.tickets%rowtype;
  v_after public.tickets%rowtype;
  v_result text;
  v_reason text;
  v_mode text := case when coalesce(p_offline_local_id, '') <> '' then 'offline_sync' else 'online' end;
  v_has_access boolean;
begin
  v_has_access := (
    public.app_has_permission('tickets.scan')
    or public.app_has_permission('admin.panel')
    or public.app_has_permission('programador.access')
    or public.app_is_role_manager()
  );
  if not v_has_access then
    raise exception 'No autorizado para escanear tickets';
  end if;

  if p_ticket_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_ticket_uuid := p_ticket_id::uuid;
  else
    v_ticket_uuid := null;
  end if;

  if v_ticket_uuid is null then
    v_result := 'invalid';
    v_reason := 'not_found';
    insert into public.ticket_scans (ticket_id, scanned_by, device_id, mode, result, raw_qr, metadata)
    values (
      null,
      auth.uid()::text,
      p_device_id,
      v_mode,
      v_reason,
      coalesce(p_raw_qr, ''),
      jsonb_build_object('offline_local_id', p_offline_local_id, 'requested_ticket_id', p_ticket_id)
    );
    return jsonb_build_object('result', v_result, 'reason', v_reason, 'ticket', null);
  end if;

  select * into v_ticket from public.tickets where id = v_ticket_uuid;
  if not found then
    v_result := 'invalid';
    v_reason := 'not_found';
    insert into public.ticket_scans (ticket_id, scanned_by, device_id, mode, result, raw_qr, metadata)
    values (
      null,
      auth.uid()::text,
      p_device_id,
      v_mode,
      v_reason,
      coalesce(p_raw_qr, ''),
      jsonb_build_object('offline_local_id', p_offline_local_id, 'requested_ticket_id', p_ticket_id)
    );
    return jsonb_build_object('result', v_result, 'reason', v_reason, 'ticket', null);
  end if;

  if v_ticket.estado_ticket = 'cancelado' then
    v_result := 'invalid';
    v_reason := 'cancelled';
    insert into public.ticket_scans (ticket_id, scanned_by, device_id, mode, result, raw_qr, metadata)
    values (
      v_ticket.id,
      auth.uid()::text,
      p_device_id,
      v_mode,
      v_reason,
      coalesce(p_raw_qr, ''),
      jsonb_build_object('offline_local_id', p_offline_local_id)
    );
    return jsonb_build_object('result', v_result, 'reason', v_reason, 'ticket', to_jsonb(v_ticket));
  end if;

  if v_ticket.estado_ticket = 'escaneado' then
    v_result := 'invalid';
    v_reason := 'already_scanned';
    insert into public.ticket_scans (ticket_id, scanned_by, device_id, mode, result, raw_qr, metadata)
    values (
      v_ticket.id,
      auth.uid()::text,
      p_device_id,
      v_mode,
      v_reason,
      coalesce(p_raw_qr, ''),
      jsonb_build_object('offline_local_id', p_offline_local_id)
    );
    return jsonb_build_object('result', v_result, 'reason', v_reason, 'ticket', to_jsonb(v_ticket));
  end if;

  if coalesce(v_ticket.estado_pago, '') <> 'pagado' then
    v_result := 'invalid';
    v_reason := 'unpaid';
    insert into public.ticket_scans (ticket_id, scanned_by, device_id, mode, result, raw_qr, metadata)
    values (
      v_ticket.id,
      auth.uid()::text,
      p_device_id,
      v_mode,
      v_reason,
      coalesce(p_raw_qr, ''),
      jsonb_build_object('offline_local_id', p_offline_local_id, 'estado_pago', v_ticket.estado_pago)
    );
    return jsonb_build_object('result', v_result, 'reason', v_reason, 'ticket', to_jsonb(v_ticket));
  end if;

  update public.tickets
  set estado_ticket = 'escaneado', fecha_escaneo = now()
  where id = v_ticket_uuid and estado_ticket = 'valido'
  returning * into v_after;

  if found then
    v_result := 'valid';
    v_reason := 'accepted';
    insert into public.ticket_scans (ticket_id, scanned_by, device_id, mode, result, raw_qr, metadata)
    values (
      v_after.id,
      auth.uid()::text,
      p_device_id,
      v_mode,
      v_result,
      coalesce(p_raw_qr, ''),
      jsonb_build_object('offline_local_id', p_offline_local_id)
    );
    return jsonb_build_object('result', v_result, 'reason', v_reason, 'ticket', to_jsonb(v_after));
  end if;

  select * into v_after from public.tickets where id = v_ticket_uuid;
  if found and v_after.estado_ticket = 'escaneado' then
    v_result := 'invalid';
    v_reason := 'already_scanned';
  else
    v_result := 'invalid';
    v_reason := 'conflict';
  end if;
  insert into public.ticket_scans (ticket_id, scanned_by, device_id, mode, result, raw_qr, metadata)
  values (
    v_ticket_uuid,
    auth.uid()::text,
    p_device_id,
    v_mode,
    v_reason,
    coalesce(p_raw_qr, ''),
    jsonb_build_object('offline_local_id', p_offline_local_id)
  );
  return jsonb_build_object('result', v_result, 'reason', v_reason, 'ticket', to_jsonb(v_after));
end;
$$;

revoke all on function public.scan_ticket(text, text, text, text) from public;
grant execute on function public.scan_ticket(text, text, text, text) to authenticated;

-- Impide que un no gestor cambie su propio rol o permissions jsonb (los gestores siguen usando políticas).
create or replace function public.users_block_priv_change_by_non_manager()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'update' and auth.uid() is not null and auth.uid()::text = old.id then
    if not public.app_is_role_manager() then
      if new.rol is distinct from old.rol or new.permissions is distinct from old.permissions then
        raise exception 'No autorizado a modificar rol o permisos';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_users_priv on public.users;
create trigger tr_users_priv before update on public.users
for each row execute procedure public.users_block_priv_change_by_non_manager();

-- =============================================================================
-- Seeds idempotentes: permisos por rol (tabla role_permissions)
-- =============================================================================

insert into public.role_permissions (role, permission) values
  ('trabajador', 'dashboard.manage'),
  ('trabajador', 'tickets.monitor'),
  ('trabajador', 'tickets.scan'),
  ('trabajador', 'inventory.adjust'),
  ('trabajador', 'sales.physical'),
  ('trabajador', 'parking.manage'),
  ('jefe', 'dashboard.manage'),
  ('jefe', 'tickets.monitor'),
  ('jefe', 'tickets.scan'),
  ('jefe', 'packages.manage'),
  ('jefe', 'inventory.manage'),
  ('jefe', 'inventory.adjust'),
  ('jefe', 'sales.physical'),
  ('jefe', 'parking.manage'),
  ('jefe', 'landing.manage'),
  ('jefe', 'finance.view'),
  ('jefe', 'admin.panel'),
  ('jefe', 'theme.manage'),
  ('jefe', 'roles.manage'),
  ('jefe', 'users.permissions'),
  ('programador', 'dashboard.manage'),
  ('programador', 'tickets.monitor'),
  ('programador', 'tickets.scan'),
  ('programador', 'packages.manage'),
  ('programador', 'inventory.manage'),
  ('programador', 'inventory.adjust'),
  ('programador', 'sales.physical'),
  ('programador', 'parking.manage'),
  ('programador', 'landing.manage'),
  ('programador', 'finance.view'),
  ('programador', 'admin.panel'),
  ('programador', 'theme.manage'),
  ('programador', 'roles.manage'),
  ('programador', 'users.permissions'),
  ('programador', 'programador.access')
on conflict (role, permission) do nothing;

comment on table public.role_permissions is 'Permisos base por rol; combinar en app con users.permissions jsonb.';

-- =============================================================================
-- RLS: role_permissions (solo lectura para sesiones autenticadas)
-- =============================================================================

alter table public.role_permissions enable row level security;

drop policy if exists "role_permissions_select_authenticated" on public.role_permissions;
create policy "role_permissions_select_authenticated" on public.role_permissions
  for select to authenticated using (true);

-- =============================================================================
-- RLS: users
-- =============================================================================

drop policy if exists "users_select_self" on public.users;
create policy "users_select_self" on public.users for select
  using (auth.uid() is not null and auth.uid()::text = id);

drop policy if exists "users_select_managers" on public.users;
create policy "users_select_managers" on public.users for select
  using (public.app_is_role_manager());

drop policy if exists "users_insert_self" on public.users;
create policy "users_insert_self" on public.users for insert
  with check (auth.uid() is not null and auth.uid()::text = id);

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self" on public.users for update
  using (auth.uid()::text = id)
  with check (auth.uid()::text = id);

drop policy if exists "users_update_managers" on public.users;
create policy "users_update_managers" on public.users for update
  using (public.app_is_role_manager())
  with check (public.app_is_role_manager());

-- =============================================================================
-- Catálogo público (solo filas activas para anon / cliente)
-- =============================================================================

drop policy if exists "public read productos" on public.productos;
drop policy if exists "productos_select_catalog" on public.productos;
create policy "productos_select_catalog" on public.productos for select using (activo = true);

drop policy if exists "productos_select_staff_all" on public.productos;
create policy "productos_select_staff_all" on public.productos for select to authenticated
  using (
    public.app_has_permission('inventory.manage')
    or public.app_has_permission('inventory.adjust')
    or public.app_has_permission('sales.physical')
  );

drop policy if exists "public read servicios" on public.servicios;
drop policy if exists "servicios_select_catalog" on public.servicios;
create policy "servicios_select_catalog" on public.servicios for select using (activo = true);

drop policy if exists "servicios_select_staff" on public.servicios;
create policy "servicios_select_staff" on public.servicios for select to authenticated
  using (
    public.app_has_permission('inventory.manage')
    or public.app_has_permission('sales.physical')
    or public.app_has_permission('landing.manage')
  );

drop policy if exists "public read paquetes" on public.paquetes;
drop policy if exists "paquetes_select_catalog" on public.paquetes;
create policy "paquetes_select_catalog" on public.paquetes for select using (activo = true);

drop policy if exists "paquetes_select_staff" on public.paquetes;
create policy "paquetes_select_staff" on public.paquetes for select to authenticated
  using (public.app_has_permission('packages.manage') or public.app_has_permission('dashboard.manage'));

drop policy if exists "public read landing" on public.landing_page;
drop policy if exists "landing_select_public" on public.landing_page;
create policy "landing_select_public" on public.landing_page for select using (true);

drop policy if exists "landing_write_staff" on public.landing_page;
create policy "landing_write_staff" on public.landing_page for insert to authenticated
  with check (
    public.app_has_permission('landing.manage')
    or public.app_has_permission('admin.panel')
    or public.app_is_role_manager()
  );

drop policy if exists "landing_update_staff" on public.landing_page;
create policy "landing_update_staff" on public.landing_page for update to authenticated
  using (
    public.app_has_permission('landing.manage')
    or public.app_has_permission('admin.panel')
    or public.app_is_role_manager()
  )
  with check (
    public.app_has_permission('landing.manage')
    or public.app_has_permission('admin.panel')
    or public.app_is_role_manager()
  );

drop policy if exists "public read config" on public.configuracion;
drop policy if exists "config_select_public" on public.configuracion;
create policy "config_select_public" on public.configuracion for select using (true);

drop policy if exists "config_write_manager" on public.configuracion;
create policy "config_write_manager" on public.configuracion for insert to authenticated
  with check (public.app_is_role_manager());

drop policy if exists "config_update_manager" on public.configuracion;
create policy "config_update_manager" on public.configuracion for update to authenticated
  using (public.app_is_role_manager())
  with check (public.app_is_role_manager());

drop policy if exists "public read descuentos activos" on public.descuentos;
create policy "public read descuentos activos" on public.descuentos for select using (activo = true and usos_restantes > 0);

drop policy if exists "ticket_types_select_public" on public.ticket_types;
create policy "ticket_types_select_public" on public.ticket_types for select using (activo = true);

drop policy if exists "ticket_types_select_staff" on public.ticket_types;
create policy "ticket_types_select_staff" on public.ticket_types for select to authenticated
  using (
    public.app_has_permission('admin.panel')
    or public.app_has_permission('packages.manage')
    or public.app_has_permission('programador.access')
    or public.app_is_role_manager()
  );

drop policy if exists "ticket_types_insert_staff" on public.ticket_types;
create policy "ticket_types_insert_staff" on public.ticket_types for insert to authenticated
  with check (
    public.app_has_permission('admin.panel')
    or public.app_has_permission('packages.manage')
    or public.app_has_permission('programador.access')
    or public.app_is_role_manager()
  );

drop policy if exists "ticket_types_update_staff" on public.ticket_types;
create policy "ticket_types_update_staff" on public.ticket_types for update to authenticated
  using (
    public.app_has_permission('admin.panel')
    or public.app_has_permission('packages.manage')
    or public.app_has_permission('programador.access')
    or public.app_is_role_manager()
  )
  with check (
    public.app_has_permission('admin.panel')
    or public.app_has_permission('packages.manage')
    or public.app_has_permission('programador.access')
    or public.app_is_role_manager()
  );

drop policy if exists "ticket_types_delete_staff" on public.ticket_types;
create policy "ticket_types_delete_staff" on public.ticket_types for delete to authenticated
  using (
    public.app_has_permission('admin.panel')
    or public.app_has_permission('programador.access')
    or public.app_is_role_manager()
  );

drop policy if exists "descuentos_write_manager" on public.descuentos;
drop policy if exists "descuentos_insert_manager" on public.descuentos;
create policy "descuentos_insert_manager" on public.descuentos for insert to authenticated
  with check (public.app_is_role_manager());

drop policy if exists "descuentos_update_manager" on public.descuentos;
create policy "descuentos_update_manager" on public.descuentos for update to authenticated
  using (public.app_is_role_manager())
  with check (public.app_is_role_manager());

drop policy if exists "descuentos_delete_manager" on public.descuentos;
create policy "descuentos_delete_manager" on public.descuentos for delete to authenticated
  using (public.app_is_role_manager());

-- =============================================================================
-- Tickets
-- =============================================================================

drop policy if exists "read own tickets" on public.tickets;
drop policy if exists "tickets_select_own" on public.tickets;
create policy "tickets_select_own" on public.tickets for select
  using (
    user_id is not null
    and auth.uid() is not null
    and auth.uid()::text = user_id
  );

drop policy if exists "tickets_select_staff" on public.tickets;
create policy "tickets_select_staff" on public.tickets for select
  using (
    auth.uid() is not null
    and (
      public.app_has_permission('tickets.scan')
      or public.app_has_permission('tickets.monitor')
      or public.app_has_permission('dashboard.manage')
    )
  );

drop policy if exists "tickets_insert_anonymous" on public.tickets;
create policy "tickets_insert_anonymous" on public.tickets for insert to anon
  with check (user_id is null);

drop policy if exists "tickets_insert_authenticated" on public.tickets;
create policy "tickets_insert_authenticated" on public.tickets for insert to authenticated
  with check (user_id is null or user_id = auth.uid()::text);

drop policy if exists "tickets_update_staff" on public.tickets;
create policy "tickets_update_staff" on public.tickets for update to authenticated
  using (
    public.app_has_permission('dashboard.manage')
    or public.app_has_permission('admin.panel')
    or public.app_is_role_manager()
  )
  with check (
    public.app_has_permission('dashboard.manage')
    or public.app_has_permission('admin.panel')
    or public.app_is_role_manager()
  );

drop policy if exists "ticket_scans_insert_staff" on public.ticket_scans;
create policy "ticket_scans_insert_staff" on public.ticket_scans for insert to authenticated
  with check (public.app_has_permission('tickets.scan') or public.app_is_role_manager());

drop policy if exists "ticket_scans_select_staff" on public.ticket_scans;
create policy "ticket_scans_select_staff" on public.ticket_scans for select to authenticated
  using (
    public.app_has_permission('tickets.scan')
    or public.app_has_permission('dashboard.manage')
    or public.app_is_role_manager()
  );

-- =============================================================================
-- Mesa reservas
-- =============================================================================

drop policy if exists "mesa_select_own" on public.mesa_reservas;
create policy "mesa_select_own" on public.mesa_reservas for select
  using (auth.uid() is not null and auth.uid()::text = user_id);

drop policy if exists "mesa_select_staff" on public.mesa_reservas;
create policy "mesa_select_staff" on public.mesa_reservas for select
  using (
    auth.uid() is not null
    and (
      public.app_has_permission('dashboard.manage')
      or public.app_has_permission('parking.manage')
      or public.app_has_permission('tickets.scan')
    )
  );

drop policy if exists "mesa_insert_own" on public.mesa_reservas;
create policy "mesa_insert_own" on public.mesa_reservas for insert to authenticated
  with check (user_id = auth.uid()::text);

drop policy if exists "mesa_update_staff" on public.mesa_reservas;
create policy "mesa_update_staff" on public.mesa_reservas for update to authenticated
  using (
    public.app_has_permission('dashboard.manage')
    or public.app_has_permission('parking.manage')
  )
  with check (
    public.app_has_permission('dashboard.manage')
    or public.app_has_permission('parking.manage')
  );

drop policy if exists "mesa_update_own" on public.mesa_reservas;
create policy "mesa_update_own" on public.mesa_reservas for update to authenticated
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- Lectura de ocupación del mapa: cualquier apartado visible (anon + auth) para UX Reservar/Landing.
drop policy if exists "mesa_select_apartadas_public_anon" on public.mesa_reservas;
create policy "mesa_select_apartadas_public_anon" on public.mesa_reservas for select to anon
  using (estado = 'apartada');

drop policy if exists "mesa_select_apartadas_catalogo" on public.mesa_reservas;
create policy "mesa_select_apartadas_catalogo" on public.mesa_reservas for select to authenticated
  using (estado = 'apartada');

-- =============================================================================
-- Parking spots (lectura pública, escritura staff)
-- =============================================================================

drop policy if exists "parking_select_all" on public.parking_spots;
create policy "parking_select_all" on public.parking_spots for select to anon, authenticated using (true);

drop policy if exists "parking_write_staff" on public.parking_spots;
create policy "parking_write_staff" on public.parking_spots for all to authenticated
  using (public.app_has_permission('parking.manage'))
  with check (public.app_has_permission('parking.manage'));

-- =============================================================================
-- Tema global (lectura pública, escritura theme.manage)
-- =============================================================================

drop policy if exists "app_theme_select_all" on public.app_theme;
create policy "app_theme_select_all" on public.app_theme for select to anon, authenticated using (true);

drop policy if exists "app_theme_write_managers" on public.app_theme;
create policy "app_theme_write_managers" on public.app_theme for all to authenticated
  using (public.app_has_permission('theme.manage'))
  with check (public.app_has_permission('theme.manage'));

-- =============================================================================
-- Movimientos inventario
-- =============================================================================

drop policy if exists "mov_select_staff" on public.movimiento_inventarios;
create policy "mov_select_staff" on public.movimiento_inventarios for select to authenticated
  using (
    public.app_has_permission('inventory.manage')
    or public.app_has_permission('inventory.adjust')
    or public.app_has_permission('sales.physical')
  );

drop policy if exists "mov_insert_staff" on public.movimiento_inventarios;
create policy "mov_insert_staff" on public.movimiento_inventarios for insert to authenticated
  with check (
    public.app_has_permission('inventory.adjust')
    or public.app_has_permission('inventory.manage')
  );

-- Escritura catálogo (productos / servicios / paquetes)
drop policy if exists "productos_write_inventory" on public.productos;
create policy "productos_write_inventory" on public.productos for insert to authenticated
  with check (public.app_has_permission('inventory.manage'));

drop policy if exists "productos_update_inventory" on public.productos;
create policy "productos_update_inventory" on public.productos for update to authenticated
  using (
    public.app_has_permission('inventory.manage')
    or public.app_has_permission('inventory.adjust')
  )
  with check (
    public.app_has_permission('inventory.manage')
    or public.app_has_permission('inventory.adjust')
  );

drop policy if exists "servicios_write" on public.servicios;
create policy "servicios_write" on public.servicios for insert to authenticated
  with check (
    public.app_has_permission('landing.manage')
    or public.app_has_permission('inventory.manage')
    or public.app_is_role_manager()
  );

drop policy if exists "servicios_update" on public.servicios;
create policy "servicios_update" on public.servicios for update to authenticated
  using (
    public.app_has_permission('landing.manage')
    or public.app_has_permission('inventory.manage')
    or public.app_is_role_manager()
  )
  with check (
    public.app_has_permission('landing.manage')
    or public.app_has_permission('inventory.manage')
    or public.app_is_role_manager()
  );

drop policy if exists "paquetes_write" on public.paquetes;
create policy "paquetes_write" on public.paquetes for insert to authenticated
  with check (public.app_has_permission('packages.manage') or public.app_is_role_manager());

drop policy if exists "paquetes_update" on public.paquetes;
create policy "paquetes_update" on public.paquetes for update to authenticated
  using (public.app_has_permission('packages.manage') or public.app_is_role_manager())
  with check (public.app_has_permission('packages.manage') or public.app_is_role_manager());

