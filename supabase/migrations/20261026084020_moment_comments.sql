create table public.moment_comments (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.updates(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500 and body ~ '[^[:space:]]'),
  created_at timestamptz not null default now()
);
create index moment_comments_update_page_idx on public.moment_comments(update_id,created_at desc,id desc);
create index moment_comments_user_created_idx on public.moment_comments(user_id,created_at desc);
alter table public.moment_comments enable row level security;
revoke all on public.moment_comments from anon,authenticated;
grant select on public.moment_comments to authenticated;
grant all on public.moment_comments to service_role;

create function app_private.can_access_moment_comments(p_update_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and app_private.can_view_update(p_update_id)
    and exists(select 1 from public.updates u where u.id=p_update_id
      and (u.sender_id=(select auth.uid()) or u.expires_at is null or u.expires_at>now()));
$$;
revoke all on function app_private.can_access_moment_comments(uuid) from public,anon;
grant execute on function app_private.can_access_moment_comments(uuid) to authenticated,service_role;
create policy "View comments on accessible moments" on public.moment_comments for select to authenticated
using (app_private.can_access_moment_comments(update_id) and not app_private.is_blocked_pair((select auth.uid()),user_id));

-- Return only the author information needed by the thread, including when two
-- direct recipients are not Close people. No full profile access is added.
create function app_private.list_moment_comments_impl(p_update_id uuid,p_before_created_at timestamptz default null,p_before_id uuid default null,p_limit integer default 31)
returns table(id uuid,update_id uuid,user_id uuid,body text,created_at timestamptz,display_name text,username text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not app_private.can_access_moment_comments(p_update_id) then raise exception 'comment_moment_unavailable'; end if;
  return query select c.id,c.update_id,c.user_id,c.body,c.created_at,p.display_name,p.username
    from public.moment_comments c join public.profiles p on p.id=c.user_id
    where c.update_id=p_update_id and not app_private.is_blocked_pair((select auth.uid()),c.user_id)
      and (p_before_created_at is null or (c.created_at,c.id)<(p_before_created_at,p_before_id))
    order by c.created_at desc,c.id desc limit greatest(1,least(coalesce(p_limit,31),51));
end;
$$;
revoke all on function app_private.list_moment_comments_impl(uuid,timestamptz,uuid,integer) from public,anon;
grant execute on function app_private.list_moment_comments_impl(uuid,timestamptz,uuid,integer) to authenticated;
create function public.list_moment_comments(p_update_id uuid,p_before_created_at timestamptz default null,p_before_id uuid default null,p_limit integer default 31)
returns table(id uuid,update_id uuid,user_id uuid,body text,created_at timestamptz,display_name text,username text)
language sql security invoker set search_path='' as $$ select * from app_private.list_moment_comments_impl(p_update_id,p_before_created_at,p_before_id,p_limit); $$;
revoke all on function public.list_moment_comments(uuid,timestamptz,uuid,integer) from public,anon;
grant execute on function public.list_moment_comments(uuid,timestamptz,uuid,integer) to authenticated;

create function app_private.add_moment_comment_impl(p_update_id uuid,p_body text,p_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid()); v_body text := btrim(p_body); v_existing public.moment_comments;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  if not app_private.has_current_terms(v_uid) then raise exception 'terms_required'; end if;
  if not app_private.can_access_moment_comments(p_update_id) then raise exception 'comment_moment_unavailable'; end if;
  if p_id is null or v_body is null or char_length(v_body) not between 1 and 500 or v_body !~ '[^[:space:]]' then raise exception 'comment_invalid'; end if;
  perform pg_advisory_xact_lock(hashtextextended('moment-comment:'||v_uid::text,0));
  select * into v_existing from public.moment_comments where id=p_id;
  if found then
    if v_existing.user_id=v_uid and v_existing.update_id=p_update_id and v_existing.body=v_body then return p_id; end if;
    raise exception 'comment_invalid';
  end if;
  if (select count(*) from public.moment_comments where user_id=v_uid and created_at>now()-interval '1 minute')>=20 then raise exception 'comment_rate_limited'; end if;
  insert into public.moment_comments(id,update_id,user_id,body) values(p_id,p_update_id,v_uid,v_body);
  return p_id;
end;
$$;
revoke all on function app_private.add_moment_comment_impl(uuid,text,uuid) from public,anon;
grant execute on function app_private.add_moment_comment_impl(uuid,text,uuid) to authenticated;
create function public.add_moment_comment(p_update_id uuid,p_body text,p_id uuid) returns uuid
language sql security invoker set search_path='' as $$ select app_private.add_moment_comment_impl(p_update_id,p_body,p_id); $$;
revoke all on function public.add_moment_comment(uuid,text,uuid) from public,anon;
grant execute on function public.add_moment_comment(uuid,text,uuid) to authenticated;

create function app_private.delete_moment_comment_impl(p_update_id uuid,p_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if not app_private.can_access_moment_comments(p_update_id) then raise exception 'comment_moment_unavailable'; end if;
  if exists(select 1 from public.moment_comments where id=p_id and update_id=p_update_id and user_id<>(select auth.uid())) then raise exception 'comment_delete_forbidden'; end if;
  delete from public.moment_comments where id=p_id and update_id=p_update_id and user_id=(select auth.uid());
  return true;
end;
$$;
revoke all on function app_private.delete_moment_comment_impl(uuid,uuid) from public,anon;
grant execute on function app_private.delete_moment_comment_impl(uuid,uuid) to authenticated;
create function public.delete_moment_comment(p_update_id uuid,p_id uuid) returns boolean
language sql security invoker set search_path='' as $$ select app_private.delete_moment_comment_impl(p_update_id,p_id); $$;
revoke all on function public.delete_moment_comment(uuid,uuid) from public,anon;
grant execute on function public.delete_moment_comment(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
