-- A separate, non-exposed schema avoids granting anonymous access to app_private.
create schema if not exists signup_private;
revoke all on schema signup_private from public;
grant usage on schema signup_private to anon, authenticated, service_role;
create or replace function signup_private.is_username_available_impl(p_username text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(lower(btrim(p_username)) ~ '^[a-z0-9._]{3,24}$', false)
    and not exists (select 1 from public.profiles p where p.username = lower(btrim(p_username)));
$$;
revoke all on function signup_private.is_username_available_impl(text) from public;
grant execute on function signup_private.is_username_available_impl(text) to anon, authenticated, service_role;
create or replace function public.is_username_available(p_username text)
returns boolean language sql stable set search_path = ''
as $$ select signup_private.is_username_available_impl(p_username); $$;
drop function app_private.is_username_available_impl(text);
