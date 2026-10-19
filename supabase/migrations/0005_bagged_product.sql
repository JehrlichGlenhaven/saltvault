-- Bagged product support: buy/sell by bags or pallets (incl. buy pallets, sell bags).
-- Run AFTER 0004_markup_per_ton.sql in the Supabase SQL editor.
-- Ton-based deliveries are untouched (qty_mode defaults to 'tons').

alter table public.deliveries
  add column qty_mode text not null default 'tons' check (qty_mode in ('tons', 'bags'));

-- bagged-mode fields (all null for ton deliveries)
alter table public.deliveries add column buy_unit text check (buy_unit in ('bag', 'pallet'));
alter table public.deliveries add column buy_qty numeric(8, 2) check (buy_qty is null or buy_qty > 0);
alter table public.deliveries add column buy_unit_cost numeric(10, 2) check (buy_unit_cost is null or buy_unit_cost >= 0);
alter table public.deliveries add column sell_unit text check (sell_unit in ('bag', 'pallet'));
alter table public.deliveries add column sell_qty numeric(8, 2) check (sell_qty is null or sell_qty > 0);
alter table public.deliveries add column sell_markup_per_unit numeric(10, 2) check (sell_markup_per_unit is null or sell_markup_per_unit >= 0);
alter table public.deliveries add column sell_unit_price numeric(10, 2);
alter table public.deliveries add column bags_per_pallet numeric(6, 2) check (bags_per_pallet is null or bags_per_pallet > 0);

-- actuals captured at reconciliation (bagged mode)
alter table public.deliveries add column actual_sell_qty numeric(8, 2) check (actual_sell_qty is null or actual_sell_qty > 0);
alter table public.deliveries add column actual_buy_qty numeric(8, 2) check (actual_buy_qty is null or actual_buy_qty > 0);
alter table public.deliveries add column actual_buy_unit_cost numeric(10, 2) check (actual_buy_unit_cost is null or actual_buy_unit_cost >= 0);
