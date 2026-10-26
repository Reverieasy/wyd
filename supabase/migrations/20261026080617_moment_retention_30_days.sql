-- At 30 days, all moment access stops immediately. Storage cleanup follows on cron.
create function app_private.can_user_view_update(p_update_id uuid,p_user_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select p_user_id is not null and exists(select 1 from public.updates u
    where u.id=p_update_id and u.created_at>now()-interval '30 days' and (
      u.sender_id=p_user_id or (
        not app_private.is_blocked_pair(u.sender_id,p_user_id)
        and exists(select 1 from public.update_recipients r where r.update_id=u.id and r.recipient_id=p_user_id
          and ((r.is_direct and app_private.are_connected(u.sender_id,p_user_id)) or exists(
            select 1 from public.circle_updates cu
            join public.circle_members sender on sender.circle_id=cu.circle_id and sender.user_id=u.sender_id
            join public.circle_members viewer on viewer.circle_id=cu.circle_id and viewer.user_id=p_user_id
            where cu.update_id=u.id
          )))
      )
    ));
$$;
revoke all on function app_private.can_user_view_update(uuid,uuid) from public,anon,authenticated;
grant execute on function app_private.can_user_view_update(uuid,uuid) to service_role;
create or replace function app_private.can_view_update(p_update_id uuid) returns boolean
language sql stable security definer set search_path='' as $$ select app_private.can_user_view_update(p_update_id,(select auth.uid())); $$;
create function public.can_receive_moment(p_update_id uuid,p_user_id uuid) returns boolean
language sql security invoker set search_path='' as $$ select app_private.can_user_view_update(p_update_id,p_user_id); $$;
revoke all on function public.can_receive_moment(uuid,uuid) from public,anon,authenticated;
grant execute on function public.can_receive_moment(uuid,uuid) to service_role;

alter policy "Current participants download photos" on storage.objects to authenticated using (
  bucket_id='moment-photos' and created_at>now()-interval '30 days'
  and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info','object.head_authenticated_info','object.info_authenticated','object.list'])
  and ((storage.foldername(name))[1]=(select auth.uid())::text
    or exists(select 1 from public.updates u where u.photo_path=objects.name and app_private.can_view_update(u.id)))
);

-- Read object names through a service-only RPC; actual object deletion uses Storage API.
create function app_private.list_expired_moment_objects_impl(p_cutoff timestamptz,p_limit integer default 200)
returns table(name text) language sql stable security definer set search_path='' as $$
  select o.name from storage.objects o where o.bucket_id='moment-photos'
    and o.created_at<=least(p_cutoff,now()-interval '30 days')
  order by o.created_at,o.id limit greatest(1,least(coalesce(p_limit,200),200));
$$;
revoke all on function app_private.list_expired_moment_objects_impl(timestamptz,integer) from public,anon,authenticated;
grant execute on function app_private.list_expired_moment_objects_impl(timestamptz,integer) to service_role;
create function public.list_expired_moment_objects(p_cutoff timestamptz,p_limit integer default 200)
returns table(name text) language sql security invoker set search_path='' as $$ select * from app_private.list_expired_moment_objects_impl(p_cutoff,p_limit); $$;
revoke all on function public.list_expired_moment_objects(timestamptz,integer) from public,anon,authenticated;
grant execute on function public.list_expired_moment_objects(timestamptz,integer) to service_role;

create function app_private.dispatch_moment_cleanup() returns bigint
language sql security definer set search_path='' as $$
  select net.http_post(url:=rtrim(c.base_url,'/')||'/functions/v1/cleanup-expired-moments',
    headers:=jsonb_build_object('Content-Type','application/json','x-worker-secret',c.secret),
    body:='{}'::jsonb,timeout_milliseconds:=60000)
  from app_private.worker_config c where c.singleton=true;
$$;
revoke all on function app_private.dispatch_moment_cleanup() from public,anon,authenticated;
grant execute on function app_private.dispatch_moment_cleanup() to service_role;
select cron.schedule('wyd-moment-retention','*/15 * * * *','select app_private.dispatch_moment_cleanup()');
notify pgrst,'reload schema';
