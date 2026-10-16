-- Glenhaven Salt Ops — Phase 1 initial schema
-- Apply in Supabase (SQL editor or `supabase db push`).

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists pgcrypto;

-- ============================================================
-- Profiles + roles (extends Supabase Auth)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('admin', 'office', 'viewer')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'viewer');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helper used by RLS policies
create or replace function public.my_role()
returns text
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- Catalog
-- ============================================================
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_date date,
  end_date date,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_name text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit text not null default 'ton',
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.subcontractors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  company text,
  contact_name text,
  phone text,
  email text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  subcontractor_id uuid not null references public.subcontractors (id),
  notes text,
  created_at timestamptz not null default now(),
  unique (name, subcontractor_id)
);

-- ============================================================
-- Pricing (dated, history preserved — never overwrite, close the window)
-- ============================================================
create table public.supplier_prices (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id),
  product_id uuid not null references public.products (id),
  price_per_ton numeric(10, 2) not null check (price_per_ton >= 0),
  effective_from date not null,
  effective_to date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from)
);

create table public.markup_rules (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global', 'product', 'subcontractor')),
  product_id uuid references public.products (id),
  subcontractor_id uuid references public.subcontractors (id),
  markup_pct numeric(6, 3) not null check (markup_pct >= 0),
  effective_from date not null,
  effective_to date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from),
  check (
    (scope = 'global' and product_id is null and subcontractor_id is null)
    or (scope = 'product' and product_id is not null and subcontractor_id is null)
    or (scope = 'subcontractor' and subcontractor_id is not null and product_id is null)
  )
);

-- ============================================================
-- Deliveries (central record) + pipeline milestones
-- ============================================================
create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id),
  supplier_id uuid not null references public.suppliers (id),
  product_id uuid not null references public.products (id),
  subcontractor_id uuid not null references public.subcontractors (id),
  site_id uuid not null references public.sites (id),

  -- quantity: sold by the triaxle (load); tons estimated until supplier invoice arrives
  loads numeric(6, 2) not null default 1 check (loads > 0),
  est_tons_per_load numeric(6, 2) not null default 24 check (est_tons_per_load > 0),
  est_tons numeric(8, 2) generated always as (loads * est_tons_per_load) stored,
  actual_tons numeric(8, 2) check (actual_tons is null or actual_tons > 0),

  -- per-ton prices snapshotted at order time
  cost_per_ton numeric(10, 2) not null check (cost_per_ton >= 0),
  sell_per_ton numeric(10, 2) not null check (sell_per_ton >= 0),
  misc_fee numeric(10, 2) not null default 0,

  supplier_ticket text,
  notes text,

  -- pipeline milestones, in order
  order_placed_at timestamptz,
  supplier_confirmed_at timestamptz,
  sub_confirmed_at timestamptz,
  delivered_at timestamptz,
  reconciled_at timestamptz,
  sub_invoiced_at timestamptz,
  sub_paid_at timestamptz,
  supplier_invoiced_at timestamptz,
  supplier_paid_at timestamptz,

  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deliveries_season_idx on public.deliveries (season_id);
create index deliveries_sub_idx on public.deliveries (subcontractor_id);
create index deliveries_site_idx on public.deliveries (site_id);

-- Audit trail for pipeline moves and edits
create table public.delivery_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries (id) on delete cascade,
  event text not null,
  from_stage text,
  to_stage text,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index delivery_events_delivery_idx on public.delivery_events (delivery_id);

-- ============================================================
-- Invoicing & payments (both directions)
-- ============================================================
create table public.sub_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  subcontractor_id uuid not null references public.subcontractors (id),
  season_id uuid not null references public.seasons (id),
  issue_date date not null,
  due_date date,
  status text not null default 'open' check (status in ('open', 'partial', 'paid', 'void')),
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.sub_invoice_items (
  id uuid primary key default gen_random_uuid(),
  sub_invoice_id uuid not null references public.sub_invoices (id) on delete cascade,
  delivery_id uuid not null unique references public.deliveries (id), -- a delivery is billed to a sub at most once
  amount numeric(12, 2) not null check (amount >= 0)
);

create table public.supplier_bills (
  id uuid primary key default gen_random_uuid(),
  bill_number text not null,
  supplier_id uuid not null references public.suppliers (id),
  season_id uuid not null references public.seasons (id),
  issue_date date not null,
  due_date date,
  status text not null default 'open' check (status in ('open', 'partial', 'paid', 'void')),
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (supplier_id, bill_number)
);

create table public.supplier_bill_items (
  id uuid primary key default gen_random_uuid(),
  supplier_bill_id uuid not null references public.supplier_bills (id) on delete cascade,
  delivery_id uuid not null references public.deliveries (id),
  amount numeric(12, 2) not null check (amount >= 0),
  unique (supplier_bill_id, delivery_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  sub_invoice_id uuid references public.sub_invoices (id),
  supplier_bill_id uuid references public.supplier_bills (id),
  amount numeric(12, 2) not null check (amount > 0),
  payment_date date not null,
  method text,
  reference text,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (
    (sub_invoice_id is not null and supplier_bill_id is null)
    or (supplier_bill_id is not null and sub_invoice_id is null)
  )
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.subcontractors enable row level security;
alter table public.sites enable row level security;
alter table public.supplier_prices enable row level security;
alter table public.markup_rules enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_events enable row level security;
alter table public.sub_invoices enable row level security;
alter table public.sub_invoice_items enable row level security;
alter table public.supplier_bills enable row level security;
alter table public.supplier_bill_items enable row level security;
alter table public.payments enable row level security;

-- profiles: everyone reads their own row; admins can read/update all
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid() or public.my_role() = 'admin');
create policy profiles_update_admin on public.profiles
  for update to authenticated using (public.my_role() = 'admin');
create policy profiles_insert_admin on public.profiles
  for insert to authenticated with check (public.my_role() = 'admin');

-- catalog + transactions: read for all authenticated users,
-- write for admin/office — except price tables, which are admin-only writes.

-- seasons
create policy seasons_select on public.seasons for select to authenticated using (true);
create policy seasons_write on public.seasons for all to authenticated
  using (public.my_role() in ('admin', 'office')) with check (public.my_role() in ('admin', 'office'));

-- suppliers
create policy suppliers_select on public.suppliers for select to authenticated using (true);
create policy suppliers_write on public.suppliers for all to authenticated
  using (public.my_role() in ('admin', 'office')) with check (public.my_role() in ('admin', 'office'));

-- products
create policy products_select on public.products for select to authenticated using (true);
create policy products_write on public.products for all to authenticated
  using (public.my_role() in ('admin', 'office')) with check (public.my_role() in ('admin', 'office'));

-- subcontractors
create policy subcontractors_select on public.subcontractors for select to authenticated using (true);
create policy subcontractors_write on public.subcontractors for all to authenticated
  using (public.my_role() in ('admin', 'office')) with check (public.my_role() in ('admin', 'office'));

-- sites
create policy sites_select on public.sites for select to authenticated using (true);
create policy sites_write on public.sites for all to authenticated
  using (public.my_role() in ('admin', 'office')) with check (public.my_role() in ('admin', 'office'));

-- supplier_prices: admin-only writes
create policy supplier_prices_select on public.supplier_prices for select to authenticated using (true);
create policy supplier_prices_write on public.supplier_prices for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- markup_rules: admin-only writes
create policy markup_rules_select on public.markup_rules for select to authenticated using (true);
create policy markup_rules_write on public.markup_rules for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- deliveries
create policy deliveries_select on public.deliveries for select to authenticated using (true);
create policy deliveries_write on public.deliveries for all to authenticated
  using (public.my_role() in ('admin', 'office')) with check (public.my_role() in ('admin', 'office'));

-- delivery_events
create policy delivery_events_select on public.delivery_events for select to authenticated using (true);
create policy delivery_events_insert on public.delivery_events for insert to authenticated
  with check (public.my_role() in ('admin', 'office'));

-- sub_invoices
create policy sub_invoices_select on public.sub_invoices for select to authenticated using (true);
create policy sub_invoices_write on public.sub_invoices for all to authenticated
  using (public.my_role() in ('admin', 'office')) with check (public.my_role() in ('admin', 'office'));

-- sub_invoice_items
create policy sub_invoice_items_select on public.sub_invoice_items for select to authenticated using (true);
create policy sub_invoice_items_write on public.sub_invoice_items for all to authenticated
  using (public.my_role() in ('admin', 'office')) with check (public.my_role() in ('admin', 'office'));

-- supplier_bills
create policy supplier_bills_select on public.supplier_bills for select to authenticated using (true);
create policy supplier_bills_write on public.supplier_bills for all to authenticated
  using (public.my_role() in ('admin', 'office')) with check (public.my_role() in ('admin', 'office'));

-- supplier_bill_items
create policy supplier_bill_items_select on public.supplier_bill_items for select to authenticated using (true);
create policy supplier_bill_items_write on public.supplier_bill_items for all to authenticated
  using (public.my_role() in ('admin', 'office')) with check (public.my_role() in ('admin', 'office'));

-- payments
create policy payments_select on public.payments for select to authenticated using (true);
create policy payments_write on public.payments for all to authenticated
  using (public.my_role() in ('admin', 'office')) with check (public.my_role() in ('admin', 'office'));
