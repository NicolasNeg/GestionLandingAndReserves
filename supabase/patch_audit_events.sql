-- PATCH INCREMENTAL — audit_events

begin;

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id text,
  actor_email text,
  event_type text not null,
  entity_type text,
  entity_id text,
  severity text not null default 'info',
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_audit_events_created_at on public.audit_events(created_at desc);
create index if not exists idx_audit_events_event_type on public.audit_events(event_type);
create index if not exists idx_audit_events_entity on public.audit_events(entity_type, entity_id);
create index if not exists idx_audit_events_actor on public.audit_events(actor_user_id);

alter table public.audit_events enable row level security;

drop policy if exists "audit_events_insert_auth" on public.audit_events;
create policy "audit_events_insert_auth" on public.audit_events
for insert to authenticated
with check (
  auth.uid() is not null
  and (
    public.app_has_permission('dashboard.manage')
    or public.app_has_permission('admin.panel')
    or public.app_has_permission('programador.access')
    or public.app_has_permission('users.permissions')
    or public.app_has_permission('tickets.scan')
    or public.app_has_permission('sales.physical')
  )
);

drop policy if exists "audit_events_select_staff" on public.audit_events;
create policy "audit_events_select_staff" on public.audit_events
for select to authenticated
using (
  public.app_has_permission('dashboard.manage')
  or public.app_has_permission('admin.panel')
  or public.app_has_permission('programador.access')
  or public.app_has_permission('users.permissions')
);

notify pgrst, 'reload schema';

commit;

