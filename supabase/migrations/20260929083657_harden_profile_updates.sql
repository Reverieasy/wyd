alter table public.profiles add column if not exists username_changed_at timestamptz;

create or replace function app_private.update_profile_impl(p_username text, p_display_name text)
returns table(id uuid, username text, display_name text, avatar_path text, created_at timestamptz, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_username text := lower(btrim(p_username));
  v_display_name text := btrim(p_display_name);
  v_current_username text;
  v_changed_at timestamptz;
begin
  if v_uid is null then raise exception using errcode='P0001', message='AUTH_REQUIRED'; end if;
  if v_username !~ '^[a-z0-9._]{3,24}$' then raise exception using errcode='P0001', message='invalid_username'; end if;
  if v_display_name = '' or char_length(v_display_name) > 40 then raise exception using errcode='P0001', message='invalid_display_name'; end if;

  select p.username, p.username_changed_at into v_current_username, v_changed_at
  from public.profiles p where p.id = v_uid for update;
  if v_current_username is null then raise exception using errcode='P0001', message='profile_not_found'; end if;
  if v_username <> v_current_username and v_changed_at is not null and v_changed_at > pg_catalog.now() - interval '7 days' then
    raise exception using errcode='P0001', message='username_rate_limited';
  end if;

  return query
  update public.profiles p
  set username = v_username,
      display_name = v_display_name,
      username_changed_at = case when v_username <> v_current_username then pg_catalog.now() else p.username_changed_at end,
      updated_at = pg_catalog.now()
  where p.id = v_uid
  returning p.id, p.username, p.display_name, p.avatar_path, p.created_at, p.updated_at;
exception
  when unique_violation then raise exception using errcode='P0001', message='username_in_use';
end;
$$;

create or replace function public.update_profile(p_username text, p_display_name text)
returns table(id uuid, username text, display_name text, avatar_path text, created_at timestamptz, updated_at timestamptz)
language sql
set search_path = ''
as $$ select * from app_private.update_profile_impl(p_username, p_display_name); $$;

revoke update on public.profiles from authenticated;
revoke all on function app_private.update_profile_impl(text, text) from public, anon;
revoke all on function public.update_profile(text, text) from public, anon;
grant execute on function app_private.update_profile_impl(text, text) to authenticated, service_role;
grant execute on function public.update_profile(text, text) to authenticated, service_role;
