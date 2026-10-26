alter table public.notification_preferences add column comments boolean not null default true;
alter table public.notification_jobs drop constraint notification_jobs_event_type_check;
alter table public.notification_jobs add constraint notification_jobs_event_type_check check(event_type in ('moment','nudge','reaction','comment','connection_request','connection_accepted'));
alter table public.notification_deliveries drop constraint notification_deliveries_event_type_check;
alter table public.notification_deliveries add constraint notification_deliveries_event_type_check check(event_type in ('moment','nudge','reaction','comment','connection_request','connection_accepted'));

create function app_private.notify_moment_comment() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_comment public.moment_comments; v_owner uuid;
begin
  v_comment := case when tg_op='DELETE' then old else new end;
  select sender_id into v_owner from public.updates where id=v_comment.update_id;
  if v_owner is null or v_owner=v_comment.user_id or app_private.is_blocked_pair(v_owner,v_comment.user_id) then return v_comment; end if;
  if tg_op='INSERT' then
    insert into public.notification_jobs(actor_id,event_type,event_id) values(v_comment.user_id,'comment',v_comment.id) on conflict(event_type,event_id) do nothing;
  end if;
  perform realtime.send(jsonb_build_object('kind','comment','entityId',v_comment.id,'updateId',v_comment.update_id),'app_changed','user:'||v_owner::text,true);
  return v_comment;
end;
$$;
revoke all on function app_private.notify_moment_comment() from public,anon,authenticated;
create trigger moment_comment_notifications after insert or delete on public.moment_comments for each row execute function app_private.notify_moment_comment();

create function app_private.list_comment_notifications_impl(p_before_created_at timestamptz default null,p_limit integer default 31)
returns table(id uuid,update_id uuid,user_id uuid,created_at timestamptz,display_name text,username text,avatar_path text)
language sql stable security definer set search_path='' as $$
  select c.id,c.update_id,c.user_id,c.created_at,p.display_name,p.username,p.avatar_path
  from public.moment_comments c join public.updates u on u.id=c.update_id join public.profiles p on p.id=c.user_id
  where (select auth.uid()) is not null and u.sender_id=(select auth.uid()) and c.user_id<>(select auth.uid())
    and app_private.can_access_moment_comments(c.update_id) and not app_private.is_blocked_pair((select auth.uid()),c.user_id)
    and (p_before_created_at is null or c.created_at<=p_before_created_at)
  order by c.created_at desc,c.id desc limit greatest(1,least(coalesce(p_limit,31),51));
$$;
revoke all on function app_private.list_comment_notifications_impl(timestamptz,integer) from public,anon;
grant execute on function app_private.list_comment_notifications_impl(timestamptz,integer) to authenticated;
create function public.list_comment_notifications(p_before_created_at timestamptz default null,p_limit integer default 31)
returns table(id uuid,update_id uuid,user_id uuid,created_at timestamptz,display_name text,username text,avatar_path text)
language sql security invoker set search_path='' as $$ select * from app_private.list_comment_notifications_impl(p_before_created_at,p_limit); $$;
revoke all on function public.list_comment_notifications(timestamptz,integer) from public,anon;
grant execute on function public.list_comment_notifications(timestamptz,integer) to authenticated;
notify pgrst,'reload schema';
