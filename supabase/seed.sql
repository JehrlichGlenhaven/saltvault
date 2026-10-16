-- Seed data for Glenhaven Salt Ops (idempotent)

-- Season
insert into public.seasons (name, start_date, end_date, is_active)
select '2026–2027', date '2026-11-01', date '2027-03-31', true
where not exists (select 1 from public.seasons where name = '2026–2027');

-- Supplier
insert into public.suppliers (name, contact_name, phone, email)
select 'Morton Salt', 'Sales Desk', null, null
where not exists (select 1 from public.suppliers where name = 'Morton Salt');

-- Products
insert into public.products (name, unit, description)
select 'Bulk Rock Salt', 'ton', 'Standard bulk road salt'
where not exists (select 1 from public.products where name = 'Bulk Rock Salt');
insert into public.products (name, unit, description)
select 'Treated Rock Salt', 'ton', 'Treated / pre-wetted bulk salt'
where not exists (select 1 from public.products where name = 'Treated Rock Salt');
insert into public.products (name, unit, description)
select 'Bagged Salt', 'bag', '50 lb bags'
where not exists (select 1 from public.products where name = 'Bagged Salt');

-- Global markup rule: 15% from 2026-10-01
insert into public.markup_rules (scope, markup_pct, effective_from)
select 'global', 15.000, date '2026-10-01'
where not exists (
  select 1 from public.markup_rules where scope = 'global' and effective_from = date '2026-10-01'
);

-- Supplier price: Bulk Rock Salt $82.00/ton from Morton, effective 2026-10-01
insert into public.supplier_prices (supplier_id, product_id, price_per_ton, effective_from)
select s.id, p.id, 82.00, date '2026-10-01'
from public.suppliers s, public.products p
where s.name = 'Morton Salt' and p.name = 'Bulk Rock Salt'
  and not exists (
    select 1 from public.supplier_prices sp
    where sp.supplier_id = s.id and sp.product_id = p.id and sp.effective_from = date '2026-10-01'
  );

-- Supplier price: Treated Rock Salt $96.00/ton from Morton, effective 2026-10-01
insert into public.supplier_prices (supplier_id, product_id, price_per_ton, effective_from)
select s.id, p.id, 96.00, date '2026-10-01'
from public.suppliers s, public.products p
where s.name = 'Morton Salt' and p.name = 'Treated Rock Salt'
  and not exists (
    select 1 from public.supplier_prices sp
    where sp.supplier_id = s.id and sp.product_id = p.id and sp.effective_from = date '2026-10-01'
  );

-- Sample subcontractors
insert into public.subcontractors (name, company, contact_name)
select 'Joe Smith', 'Smith Plowing LLC', 'Joe Smith'
where not exists (select 1 from public.subcontractors where name = 'Joe Smith');
insert into public.subcontractors (name, company, contact_name)
select 'Maria Garcia', 'Garcia Snow Services', 'Maria Garcia'
where not exists (select 1 from public.subcontractors where name = 'Maria Garcia');

-- Sample sites (two per sub)
insert into public.sites (name, address, subcontractor_id)
select 'Riverside Plaza', '100 Riverside Dr', sc.id
from public.subcontractors sc
where sc.name = 'Joe Smith'
  and not exists (
    select 1 from public.sites st where st.name = 'Riverside Plaza' and st.subcontractor_id = sc.id
  );
insert into public.sites (name, address, subcontractor_id)
select 'Hilltop Medical Center', '42 Hilltop Ave', sc.id
from public.subcontractors sc
where sc.name = 'Joe Smith'
  and not exists (
    select 1 from public.sites st where st.name = 'Hilltop Medical Center' and st.subcontractor_id = sc.id
  );
insert into public.sites (name, address, subcontractor_id)
select 'Northgate Shopping Center', '800 Northgate Blvd', sc.id
from public.subcontractors sc
where sc.name = 'Maria Garcia'
  and not exists (
    select 1 from public.sites st where st.name = 'Northgate Shopping Center' and st.subcontractor_id = sc.id
  );
insert into public.sites (name, address, subcontractor_id)
select 'Cedar Ridge Apartments', '15 Cedar Ridge Ln', sc.id
from public.subcontractors sc
where sc.name = 'Maria Garcia'
  and not exists (
    select 1 from public.sites st where st.name = 'Cedar Ridge Apartments' and st.subcontractor_id = sc.id
  );
