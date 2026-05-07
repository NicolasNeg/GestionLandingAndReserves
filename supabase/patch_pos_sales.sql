-- PATCH POS / VENTAS FISICAS / CAJA

begin;

create table if not exists public.physical_sales (
  id uuid primary key default gen_random_uuid(),
  cashier_user_id text,
  cashier_email text,
  payment_method text not null,
  subtotal numeric not null default 0,
  discount_total numeric not null default 0,
  tax_total numeric not null default 0,
  total numeric not null default 0,
  status text not null default 'paid',
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.physical_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.physical_sales(id) on delete cascade,
  item_type text not null,
  item_id text,
  code text,
  name text not null,
  qty integer not null default 1,
  price numeric not null default 0,
  subtotal numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  amount numeric not null default 0,
  method text,
  related_type text,
  related_id text,
  created_by text,
  created_by_email text,
  created_at timestamptz not null default now(),
  notes text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.productos add column if not exists codigo text;

create index if not exists idx_physical_sales_created_at on public.physical_sales(created_at desc);
create index if not exists idx_physical_sales_cashier on public.physical_sales(cashier_user_id);
create index if not exists idx_physical_sale_items_sale_id on public.physical_sale_items(sale_id);
create index if not exists idx_cash_movements_created_at on public.cash_movements(created_at desc);
create index if not exists idx_cash_movements_type on public.cash_movements(type);
create index if not exists idx_cash_movements_method on public.cash_movements(method);
create unique index if not exists uq_productos_codigo_not_null on public.productos(codigo) where codigo is not null;

alter table public.physical_sales enable row level security;
alter table public.physical_sale_items enable row level security;
alter table public.cash_movements enable row level security;

drop policy if exists "physical_sales_insert_staff" on public.physical_sales;
create policy "physical_sales_insert_staff" on public.physical_sales
for insert to authenticated
with check (
  public.app_has_permission('sales.physical')
  or public.app_has_permission('admin.panel')
  or public.app_has_permission('programador.access')
);

drop policy if exists "physical_sales_select_staff" on public.physical_sales;
create policy "physical_sales_select_staff" on public.physical_sales
for select to authenticated
using (
  public.app_has_permission('sales.physical')
  or public.app_has_permission('dashboard.manage')
  or public.app_has_permission('admin.panel')
  or public.app_has_permission('programador.access')
  or public.app_has_permission('finance.view')
);

drop policy if exists "physical_sale_items_insert_staff" on public.physical_sale_items;
create policy "physical_sale_items_insert_staff" on public.physical_sale_items
for insert to authenticated
with check (
  public.app_has_permission('sales.physical')
  or public.app_has_permission('admin.panel')
  or public.app_has_permission('programador.access')
);

drop policy if exists "physical_sale_items_select_staff" on public.physical_sale_items;
create policy "physical_sale_items_select_staff" on public.physical_sale_items
for select to authenticated
using (
  public.app_has_permission('sales.physical')
  or public.app_has_permission('dashboard.manage')
  or public.app_has_permission('inventory.manage')
  or public.app_has_permission('admin.panel')
  or public.app_has_permission('programador.access')
  or public.app_has_permission('finance.view')
);

drop policy if exists "cash_movements_insert_staff" on public.cash_movements;
create policy "cash_movements_insert_staff" on public.cash_movements
for insert to authenticated
with check (
  public.app_has_permission('sales.physical')
  or public.app_has_permission('admin.panel')
  or public.app_has_permission('programador.access')
);

drop policy if exists "cash_movements_select_staff" on public.cash_movements;
create policy "cash_movements_select_staff" on public.cash_movements
for select to authenticated
using (
  public.app_has_permission('sales.physical')
  or public.app_has_permission('dashboard.manage')
  or public.app_has_permission('admin.panel')
  or public.app_has_permission('programador.access')
  or public.app_has_permission('finance.view')
);

notify pgrst, 'reload schema';

commit;
