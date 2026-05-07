-- PATCH INCREMENTAL — ticket_delivery_logs

begin;

create table if not exists public.ticket_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  ticket_id text not null,
  email text,
  channel text not null default 'email',
  status text not null default 'sent',
  error text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.ticket_delivery_logs enable row level security;

drop policy if exists "ticket_delivery_insert_auth" on public.ticket_delivery_logs;
create policy "ticket_delivery_insert_auth" on public.ticket_delivery_logs
for insert to authenticated
with check (auth.uid() is not null);

drop policy if exists "ticket_delivery_select_owner_or_staff" on public.ticket_delivery_logs;
create policy "ticket_delivery_select_owner_or_staff" on public.ticket_delivery_logs
for select to authenticated
using (
  exists (
    select 1
    from public.tickets t
    where t.id::text = ticket_delivery_logs.ticket_id
      and (
        t.user_id = auth.uid()::text
        or public.app_has_permission('admin.panel')
        or public.app_has_permission('dashboard.manage')
        or public.app_has_permission('tickets.scan')
        or public.app_has_permission('programador.access')
      )
  )
);

create index if not exists idx_ticket_delivery_logs_ticket on public.ticket_delivery_logs(ticket_id, created_at desc);

notify pgrst, 'reload schema';

commit;

