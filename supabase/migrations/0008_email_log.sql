-- Order confirmation email log. Run AFTER 0007_inventory_bulk.sql in the Supabase SQL editor.

create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries (id) on delete cascade,
  to_email text not null,
  subject text not null,
  body text not null,
  provider_message_id text,
  sent_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index email_logs_delivery_idx on public.email_logs (delivery_id);

alter table public.email_logs enable row level security;

create policy email_logs_select on public.email_logs
  for select to authenticated using (true);
create policy email_logs_insert on public.email_logs
  for insert to authenticated
  with check (public.my_role() in ('admin', 'office'));
