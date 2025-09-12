-- Seed a dispatcher linked to an existing auth user (replace email as needed)
-- In Supabase SQL editor, first find an auth user:
-- select id, email from auth.users order by created_at desc limit 5;
-- Then paste the user_id below.

insert into public.dispatchers (user_id, name)
values (
  '00000000-0000-0000-0000-000000000000'::uuid, -- replace with real auth.users.id
  'Demo Dispatcher'
)
on conflict (user_id) do update set name = excluded.name;

select id, user_id, name, created_at from public.dispatchers order by created_at desc;

