-- Idempotent patch for Supabase-only runtime 404s.
-- Safe to run multiple times in Supabase SQL Editor.

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

create index if not exists idx_parking_spots_updated
  on public.parking_spots(updated_at desc);

create table if not exists public.app_theme (
  id text primary key default 'global',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_theme (id, payload)
values ('global', '{}'::jsonb)
on conflict (id) do nothing;

alter table public.parking_spots enable row level security;
alter table public.app_theme enable row level security;

-- Public read (anon + authenticated) for UI bootstrap.
drop policy if exists "parking_select_all" on public.parking_spots;
create policy "parking_select_all" on public.parking_spots
  for select to anon, authenticated
  using (true);

drop policy if exists "app_theme_select_all" on public.app_theme;
create policy "app_theme_select_all" on public.app_theme
  for select to anon, authenticated
  using (true);

-- Staff write for parking: restricted by app_has_permission('parking.manage').
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'app_has_permission'
  ) then
    execute 'drop policy if exists "parking_write_staff" on public.parking_spots';
    execute $sql$
      create policy "parking_write_staff" on public.parking_spots
      for all to authenticated
      using (public.app_has_permission('parking.manage'))
      with check (public.app_has_permission('parking.manage'))
    $sql$;
  else
    raise notice 'app_has_permission(text) no existe. No se creó policy de escritura para parking_spots.';
  end if;
end $$;
