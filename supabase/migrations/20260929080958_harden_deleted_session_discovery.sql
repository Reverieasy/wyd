create or replace function app_private.find_profile_by_username_impl(p_username text)
returns table(id uuid, username text, display_name text, avatar_path text, created_at timestamptz, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not exists (select 1 from public.profiles where profiles.id = v_uid) then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  return query
  select p.id, p.username, p.display_name, p.avatar_path, p.created_at, p.updated_at
  from public.profiles p
  where p.username = lower(btrim(p_username))
    and p.id <> v_uid
    and not app_private.is_blocked_pair(v_uid, p.id)
  limit 1;
end;
$$;
