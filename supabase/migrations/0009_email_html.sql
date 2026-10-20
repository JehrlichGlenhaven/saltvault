-- Rich text email bodies. Run AFTER 0008_email_log.sql in the Supabase SQL editor.

alter table public.email_logs add column body_html text;
