-- =============================================================================
-- PATCH INCREMENTAL — ticket_scans + RPC scan_ticket
-- Ejecutar en Supabase SQL Editor si aparece:
--   "Could not find the table 'public.ticket_scans' in the schema cache"
-- o fallos al escanear (scan_ticket).
--
-- Requiere tablas existentes: public.tickets, public.users y funciones de permisos
-- (app_has_permission, app_is_role_manager) como en supabase/schema.sql.
-- =============================================================================

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

create index if not exists idx_ticket_scans_scanned_at on public.ticket_scans (scanned_at desc);

alter table public.ticket_scans enable row level security;

drop policy if exists "ticket_scans_insert_staff" on public.ticket_scans;
create policy "ticket_scans_insert_staff" on public.ticket_scans for insert to authenticated
  with check (
    public.app_has_permission('tickets.scan')
    or public.app_has_permission('programador.access')
    or public.app_is_role_manager()
  );

drop policy if exists "ticket_scans_select_staff" on public.ticket_scans;
create policy "ticket_scans_select_staff" on public.ticket_scans for select to authenticated
  using (
    public.app_has_permission('tickets.scan')
    or public.app_has_permission('tickets.monitor')
    or public.app_has_permission('dashboard.manage')
    or public.app_has_permission('admin.panel')
    or public.app_has_permission('programador.access')
    or public.app_is_role_manager()
  );

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

notify pgrst, 'reload schema';
