-- Make the stock ledger unit-agnostic: qty is in the PRODUCT's unit
-- (bags for bagged products, tons for bulk products like rock salt).
-- Run AFTER 0006_inventory.sql in the Supabase SQL editor.

alter table public.inventory_movements rename column qty_bags to qty;

comment on column public.inventory_movements.qty is
  'Signed quantity in the product''s unit: bags for unit=''bag'', tons for unit=''ton''. On-hand = sum(qty) per location+product.';
