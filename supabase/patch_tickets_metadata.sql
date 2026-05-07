-- PATCH INCREMENTAL — tickets.metadata snapshot
-- Objetivo: persistir snapshot del carrito en tickets.metadata

begin;

alter table public.tickets
add column if not exists metadata jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';

commit;

