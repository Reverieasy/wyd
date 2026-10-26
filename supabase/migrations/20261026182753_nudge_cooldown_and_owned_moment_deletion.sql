create or replace function app_private.send_nudge_impl(p_recipient_id uuid)
returns table(id uuid, sender_id uuid, receiver_id uuid, status text, created_at timestamptz, responded_at timestamptz, response_update_id uuid, seen_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception using errcode='P0001', message='AUTH_REQUIRED'; end if;
  if not app_private.has_current_terms(v_uid) then raise exception using errcode='P0001', message='terms_required'; end if;
  if p_recipient_id is null or p_recipient_id = v_uid then
    raise exception using errcode='P0001', message='nudge_invalid_recipient';
  end if;
  if not app_private.are_connected(v_uid, p_recipient_id) then
    raise exception using errcode='P0001', message='nudge_not_connected';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text || ':' || p_recipient_id::text, 0));
  if exists (
    select 1 from public.nudges n
    where n.sender_id = v_uid and n.receiver_id = p_recipient_id
      and n.created_at > pg_catalog.now() - interval '10 seconds'
  ) then raise exception using errcode='P0001', message='nudge_cooldown'; end if;

  return query insert into public.nudges (sender_id, receiver_id)
  values (v_uid, p_recipient_id)
  returning nudges.id, nudges.sender_id, nudges.receiver_id, nudges.status, nudges.created_at,
            nudges.responded_at, nudges.response_update_id, nudges.seen_at;
end;
$$;

-- The authenticated Storage API removes the binary first. This RPC only
-- removes owned moment metadata after the storage object is gone.
-- Storage delete operations also need SELECT visibility of the owner's object.
alter policy "Current participants download photos" on storage.objects using (
  bucket_id='moment-photos' and (
    ((storage.foldername(name))[1]=(select auth.uid())::text
      and storage.allow_any_operation(array['object.delete','object.delete_many']))
    or (created_at>now()-interval '30 days'
      and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info','object.head_authenticated_info','object.info_authenticated','object.list'])
      and ((storage.foldername(name))[1]=(select auth.uid())::text
        or exists(select 1 from public.updates u where u.photo_path=objects.name and app_private.can_view_update(u.id))))
  )
);

create function app_private.delete_own_moment_impl(p_update_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.updates;
  v_recipients uuid[];
  v_recipient uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_row from public.updates where id=p_update_id and sender_id=v_uid for update;
  if not found then return false; end if;
  if exists(select 1 from storage.objects where bucket_id='moment-photos' and name=v_row.photo_path) then
    raise exception 'moment_photo_delete_required';
  end if;
  select coalesce(array_agg(distinct recipient_id),'{}'::uuid[]) into v_recipients
    from public.update_recipients where update_id=p_update_id;
  delete from public.updates where id=p_update_id and sender_id=v_uid;
  foreach v_recipient in array array_append(v_recipients,v_uid) loop
    if v_recipient=v_uid or not app_private.is_blocked_pair(v_uid,v_recipient) then
      perform realtime.send(jsonb_build_object('kind','moment','entityId',p_update_id),'app_changed','user:'||v_recipient::text,true);
    end if;
  end loop;
  return true;
end;
$$;
revoke all on function app_private.delete_own_moment_impl(uuid) from public,anon;
grant execute on function app_private.delete_own_moment_impl(uuid) to authenticated;
create function public.delete_own_moment(p_update_id uuid)
returns boolean language sql security invoker set search_path='' as $$
  select app_private.delete_own_moment_impl(p_update_id);
$$;
revoke all on function public.delete_own_moment(uuid) from public,anon;
grant execute on function public.delete_own_moment(uuid) to authenticated;
notify pgrst,'reload schema';

