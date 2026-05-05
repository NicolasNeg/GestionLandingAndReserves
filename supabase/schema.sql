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
alter table public.tickets enable row level security;
alter table public.mesa_reservas enable row level security;

-- Baseline policies (start permissive for reads, tighten by role after data validation).
drop policy if exists "public read productos" on public.productos;
create policy "public read productos" on public.productos for select using (true);

drop policy if exists "public read servicios" on public.servicios;
create policy "public read servicios" on public.servicios for select using (true);

drop policy if exists "public read paquetes" on public.paquetes;
create policy "public read paquetes" on public.paquetes for select using (true);

drop policy if exists "public read landing" on public.landing_page;
create policy "public read landing" on public.landing_page for select using (true);

drop policy if exists "public read config" on public.configuracion;
create policy "public read config" on public.configuracion for select using (true);

drop policy if exists "public read descuentos activos" on public.descuentos;
create policy "public read descuentos activos" on public.descuentos for select using (activo = true and usos_restantes > 0);

-- Authenticated users can read own tickets.
drop policy if exists "read own tickets" on public.tickets;
create policy "read own tickets" on public.tickets for select
using (auth.uid()::text = user_id);

