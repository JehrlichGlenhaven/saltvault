-- Inventory stock & sales. Run AFTER 0005_bagged_product.sql in the Supabase SQL editor.

create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

-- Stock ledger: signed quantities in BAGS. On-hand = sum(qty_bags) per location+product.
-- Never update rows — corrections happen via new 'adjustment' movements.
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.inventory_locations (id),
  product_id uuid not null references public.products (id),
  qty_bags numeric(10, 2) not null check (qty_bags <> 0),
  kind text not null check (kind in ('purchase', 'sale', 'adjustment')),
  unit_cost numeric(10, 2) check (unit_cost is null or unit_cost >= 0), -- per bag, snapshot
  reference text, -- supplier invoice #, reason, etc.
  delivery_id uuid references public.deliveries (id) on delete set null,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index inventory_movements_loc_prod_idx on public.inventory_movements (location_id, product_id);
create index inventory_movements_delivery_idx on public.inventory_movements (delivery_id);

alter table public.deliveries
  add column source text not null default 'supplier' check (source in ('supplier', 'inventory'));
alter table public.deliveries
  alter column supplier_id drop not null;
alter table public.deliveries
  add column inventory_location_id uuid references public.inventory_locations (id);

alter table public.inventory_locations enable row level security;
alter table public.inventory_movements enable row level security;

create policy inventory_locations_select on public.inventory_locations
  for select to authenticated using (true);
create policy inventory_locations_write on public.inventory_locations
  for all to authenticated
  using (public.my_role() in ('admin', 'office'))
  with check (public.my_role() in ('admin', 'office'));

create policy inventory_movements_select on public.inventory_movements
  for select to authenticated using (true);
create policy inventory_movements_insert on public.inventory_movements
  for insert to authenticated
  with check (public.my_role() in ('admin', 'office'));
