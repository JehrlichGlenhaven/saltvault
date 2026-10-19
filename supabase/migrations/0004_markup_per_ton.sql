-- Markup as a flat $/ton on each delivery; sell price becomes cost + markup.
-- Run AFTER 0003_all_admin.sql in the Supabase SQL editor.

-- 1) Add the markup column, backfilled from existing rows
alter table public.deliveries
  add column markup_per_ton numeric(10, 2) not null default 0;

update public.deliveries
  set markup_per_ton = round((sell_per_ton - cost_per_ton)::numeric, 2);

-- 2) Sell price is now always cost + markup (computed, can't drift)
alter table public.deliveries drop column sell_per_ton;

alter table public.deliveries
  add column sell_per_ton numeric(10, 2)
  generated always as (cost_per_ton + markup_per_ton) stored;
