-- 1. Crie primeiro o utilizador em Authentication > Users.
-- 2. Execute este código no SQL Editor depois de criar o utilizador.

insert into public.admins(user_id,email)
select id,email from auth.users where email='sidneychristian03@gmail.com'
on conflict(user_id) do update set email=excluded.email;
