-- Phase: per-delivery document uploads (sub invoice, supplier invoice, ticket scans)
-- Run AFTER 0001_init.sql in the Supabase SQL editor.

-- Private storage bucket for the files
insert into storage.buckets (id, name, public)
values ('delivery-documents', 'delivery-documents', false)
on conflict (id) do nothing;

-- Metadata table (one row per uploaded file)
create table public.delivery_documents (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries (id) on delete cascade,
  doc_type text not null default 'other' check (doc_type in ('sub_invoice', 'supplier_invoice', 'ticket', 'other')),
  file_name text not null,
  storage_path text not null unique,
  size_bytes bigint,
  content_type text,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index delivery_documents_delivery_idx on public.delivery_documents (delivery_id);

alter table public.delivery_documents enable row level security;

create policy delivery_documents_select on public.delivery_documents
  for select to authenticated using (true);
create policy delivery_documents_insert on public.delivery_documents
  for insert to authenticated with check (public.my_role() in ('admin', 'office'));
create policy delivery_documents_delete on public.delivery_documents
  for delete to authenticated using (public.my_role() in ('admin', 'office'));

-- Storage object policies: everyone authenticated can read;
-- only admin/office can upload or delete.
create policy delivery_documents_storage_read on storage.objects
  for select to authenticated
  using (bucket_id = 'delivery-documents');

create policy delivery_documents_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'delivery-documents' and public.my_role() in ('admin', 'office'));

create policy delivery_documents_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'delivery-documents' and public.my_role() in ('admin', 'office'));
