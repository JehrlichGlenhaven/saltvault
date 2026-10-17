-- Make everyone admin (small internal team) and default all future users to admin.
-- Run AFTER 0001_init.sql in the Supabase SQL editor.

-- 1) Promote every existing profile to admin
update public.profiles set role = 'admin';

-- 2) Backfill profiles for auth users that never got one
--    (e.g. users created before 0001_init.sql installed the trigger)
insert into public.profiles (id, full_name, role)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', u.email), 'admin'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- 3) From now on, every new user is created as admin
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'admin');
  return new;
end;
$$;
