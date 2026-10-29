-- Capture the audience at insert time. New commenters must not receive old replies.
create table app_private.comment_notification_recipients (
  comment_id uuid not null references public.moment_comments(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  is_reply boolean not null,
  primary key (comment_id,recipient_id)
);
create index comment_notification_recipients_user_idx
  on app_private.comment_notification_recipients(recipient_id,comment_id);
alter table app_private.comment_notification_recipients enable row level security;
revoke all on app_private.comment_notification_recipients from public,anon,authenticated;
grant all on app_private.comment_notification_recipients to service_role;

create function app_private.can_user_access_comment_thread(p_update_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select p_user_id is not null and app_private.can_user_view_update(p_update_id,p_user_id)
    and exists(select 1 from public.updates u where u.id=p_update_id
      and (u.sender_id=p_user_id or u.expires_at is null or u.expires_at>now()));
$$;
revoke all on function app_private.can_user_access_comment_thread(uuid,uuid) from public,anon,authenticated;

-- Keep existing photo-owner activity without replaying historic replies or push jobs.
insert into app_private.comment_notification_recipients(comment_id,recipient_id,is_reply)
select c.id,u.sender_id,false from public.moment_comments c
join public.updates u on u.id=c.update_id where c.user_id<>u.sender_id;

create or replace function app_private.notify_moment_comment() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_comment public.moment_comments; v_owner uuid; v_recipient uuid;
begin
  v_comment := case when tg_op='DELETE' then old else new end;
  select sender_id into v_owner from public.updates where id=v_comment.update_id;
  if v_owner is null then return v_comment; end if;
  if tg_op='INSERT' then
    insert into app_private.comment_notification_recipients(comment_id,recipient_id,is_reply)
    select v_comment.id,a.recipient_id,a.recipient_id<>v_owner from (
      select v_owner as recipient_id
      union
      select c.user_id from public.moment_comments c
        where c.update_id=v_comment.update_id and c.id<>v_comment.id
    ) a
    where a.recipient_id<>v_comment.user_id
      and not app_private.is_blocked_pair(a.recipient_id,v_comment.user_id)
      and app_private.can_user_access_comment_thread(v_comment.update_id,a.recipient_id)
      and app_private.can_user_access_comment_thread(v_comment.update_id,v_comment.user_id)
    on conflict do nothing;
    if exists(select 1 from app_private.comment_notification_recipients where comment_id=v_comment.id) then
      insert into public.notification_jobs(actor_id,event_type,event_id)
        values(v_comment.user_id,'comment',v_comment.id) on conflict(event_type,event_id) do nothing;
    end if;
  end if;
  -- A deletion refreshes the same thread participants without creating a push job.
  for v_recipient in
    select a.recipient_id from (
      select v_owner as recipient_id
      union select c.user_id from public.moment_comments c where c.update_id=v_comment.update_id
    ) a where a.recipient_id<>v_comment.user_id
      and not app_private.is_blocked_pair(a.recipient_id,v_comment.user_id)
      and app_private.can_user_access_comment_thread(v_comment.update_id,a.recipient_id)
  loop
    perform realtime.send(jsonb_build_object('kind','comment','entityId',v_comment.id,'updateId',v_comment.update_id),
      'app_changed','user:'||v_recipient::text,true);
  end loop;
  return v_comment;
end;
$$;
revoke all on function app_private.notify_moment_comment() from public,anon,authenticated;

-- Only the notification service can resolve another user's push audience.
create function app_private.comment_push_recipients_impl(p_comment_id uuid)
returns table(recipient_id uuid,is_reply boolean)
language sql stable security definer set search_path='' as $$
  select r.recipient_id,r.is_reply from app_private.comment_notification_recipients r
  join public.moment_comments c on c.id=r.comment_id
  where r.comment_id=p_comment_id and r.recipient_id<>c.user_id
    and not app_private.is_blocked_pair(r.recipient_id,c.user_id)
    and app_private.can_user_access_comment_thread(c.update_id,r.recipient_id)
    and app_private.can_user_access_comment_thread(c.update_id,c.user_id);
$$;
revoke all on function app_private.comment_push_recipients_impl(uuid) from public,anon,authenticated;
grant execute on function app_private.comment_push_recipients_impl(uuid) to service_role;
create function public.comment_push_recipients(p_comment_id uuid)
returns table(recipient_id uuid,is_reply boolean)
language sql stable security invoker set search_path='' as $$
  select * from app_private.comment_push_recipients_impl(p_comment_id);
$$;
revoke all on function public.comment_push_recipients(uuid) from public,anon,authenticated;
grant execute on function public.comment_push_recipients(uuid) to service_role;

-- Existing clients ignore the additive is_reply response field.
drop function public.list_comment_notifications(timestamptz,integer);
drop function app_private.list_comment_notifications_impl(timestamptz,integer);
create function app_private.list_comment_notifications_impl(p_before_created_at timestamptz default null,p_limit integer default 31)
returns table(id uuid,update_id uuid,user_id uuid,created_at timestamptz,display_name text,username text,avatar_path text,is_reply boolean)
language sql stable security definer set search_path='' as $$
  select c.id,c.update_id,c.user_id,c.created_at,p.display_name,p.username,p.avatar_path,r.is_reply
  from app_private.comment_notification_recipients r
  join public.moment_comments c on c.id=r.comment_id join public.profiles p on p.id=c.user_id
  where r.recipient_id=(select auth.uid()) and c.user_id<>(select auth.uid())
    and app_private.can_user_access_comment_thread(c.update_id,(select auth.uid()))
    and not app_private.is_blocked_pair((select auth.uid()),c.user_id)
    and (p_before_created_at is null or c.created_at<=p_before_created_at)
  order by c.created_at desc,c.id desc limit greatest(1,least(coalesce(p_limit,31),51));
$$;
revoke all on function app_private.list_comment_notifications_impl(timestamptz,integer) from public,anon;
grant execute on function app_private.list_comment_notifications_impl(timestamptz,integer) to authenticated;
create function public.list_comment_notifications(p_before_created_at timestamptz default null,p_limit integer default 31)
returns table(id uuid,update_id uuid,user_id uuid,created_at timestamptz,display_name text,username text,avatar_path text,is_reply boolean)
language sql stable security invoker set search_path='' as $$
  select * from app_private.list_comment_notifications_impl(p_before_created_at,p_limit);
$$;
revoke all on function public.list_comment_notifications(timestamptz,integer) from public,anon;
grant execute on function public.list_comment_notifications(timestamptz,integer) to authenticated;
notify pgrst,'reload schema';
