create or replace function app_private.list_visible_updates_impl(
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 30
)
returns table(id uuid, sender_id uuid, photo_path text, caption varchar, status_text text, is_quiet boolean, created_at timestamptz, expires_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_limit integer := greatest(1, least(coalesce(p_limit, 30), 50));
begin
  if v_uid is null or not exists (select 1 from public.profiles p where p.id = v_uid) then
    raise exception using errcode='P0001', message='AUTH_REQUIRED';
  end if;
  if (p_cursor_created_at is null) <> (p_cursor_id is null) then
    raise exception using errcode='P0001', message='invalid_cursor';
  end if;

  return query
  select u.id, u.sender_id, u.photo_path, u.caption, u.status_text, u.is_quiet, u.created_at, u.expires_at
  from public.updates u
  where app_private.can_view_update(u.id)
    and (
      p_cursor_created_at is null
      or (u.created_at, u.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by u.created_at desc, u.id desc
  limit v_limit + 1;
end;
$$;

create or replace function public.list_visible_updates(
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 30
)
returns table(id uuid, sender_id uuid, photo_path text, caption varchar, status_text text, is_quiet boolean, created_at timestamptz, expires_at timestamptz)
language sql
stable
set search_path = ''
as $$ select * from app_private.list_visible_updates_impl(p_cursor_created_at, p_cursor_id, p_limit); $$;

revoke all on function app_private.list_visible_updates_impl(timestamptz, uuid, integer) from public, anon;
revoke all on function public.list_visible_updates(timestamptz, uuid, integer) from public, anon;
grant execute on function app_private.list_visible_updates_impl(timestamptz, uuid, integer) to authenticated, service_role;
grant execute on function public.list_visible_updates(timestamptz, uuid, integer) to authenticated, service_role;
