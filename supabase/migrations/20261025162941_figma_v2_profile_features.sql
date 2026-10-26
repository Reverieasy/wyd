alter table public.profiles add column if not exists bio text not null default '' check (char_length(bio) <= 160);

-- Availability exposes only a boolean for a complete valid username, never profile data.
create or replace function app_private.is_username_available_impl(p_username text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select lower(btrim(p_username)) ~ '^[a-z0-9._]{3,24}$'
    and not exists (select 1 from public.profiles p where p.username = lower(btrim(p_username)));
$$;
create or replace function public.is_username_available(p_username text)
returns boolean language sql stable set search_path = ''
as $$ select app_private.is_username_available_impl(p_username); $$;

-- Reuse the existing username rate limit and perform both profile changes atomically.
create or replace function app_private.update_profile_v2_impl(p_username text, p_display_name text, p_bio text)
returns table(id uuid, username text, display_name text, avatar_path text, created_at timestamptz, updated_at timestamptz, bio text)
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not exists (select 1 from public.profiles p where p.id = v_uid and p.deleting_at is null) then
    raise exception using errcode='P0001', message='AUTH_REQUIRED';
  end if;
  if char_length(coalesce(p_bio, '')) > 160 then raise exception using errcode='P0001', message='invalid_bio'; end if;
  perform app_private.update_profile_impl(p_username, p_display_name);
  return query update public.profiles p set bio = btrim(coalesce(p_bio, '')), updated_at = now()
    where p.id = v_uid returning p.id, p.username, p.display_name, p.avatar_path, p.created_at, p.updated_at, p.bio;
end;
$$;
create or replace function public.update_profile_v2(p_username text, p_display_name text, p_bio text)
returns table(id uuid, username text, display_name text, avatar_path text, created_at timestamptz, updated_at timestamptz, bio text)
language sql set search_path = ''
as $$ select * from app_private.update_profile_v2_impl(p_username, p_display_name, p_bio); $$;

create or replace function app_private.get_my_profile_stats_impl()
returns table(moments bigint, moments_this_month bigint, reactions bigint)
language plpgsql stable security definer set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not exists (select 1 from public.profiles p where p.id = v_uid and p.deleting_at is null) then
    raise exception using errcode='P0001', message='AUTH_REQUIRED';
  end if;
  return query select
    (select count(*) from public.updates u where u.sender_id = v_uid),
    (select count(*) from public.updates u where u.sender_id = v_uid and u.created_at >= date_trunc('month', now())),
    (select count(*) from public.reactions r join public.updates u on u.id = r.update_id where u.sender_id = v_uid);
end;
$$;
create or replace function public.get_my_profile_stats()
returns table(moments bigint, moments_this_month bigint, reactions bigint)
language sql stable set search_path = ''
as $$ select * from app_private.get_my_profile_stats_impl(); $$;

revoke all on function app_private.is_username_available_impl(text), public.is_username_available(text) from public;
grant execute on function app_private.is_username_available_impl(text), public.is_username_available(text) to anon, authenticated, service_role;
revoke all on function app_private.update_profile_v2_impl(text,text,text), public.update_profile_v2(text,text,text),
  app_private.get_my_profile_stats_impl(), public.get_my_profile_stats() from public, anon;
grant execute on function app_private.update_profile_v2_impl(text,text,text), public.update_profile_v2(text,text,text),
  app_private.get_my_profile_stats_impl(), public.get_my_profile_stats() to authenticated, service_role;
