-- Real permission/recipient regression test; no accounts, jobs or broadcasts survive.
begin;
do $$
declare
  host uuid:=gen_random_uuid(); anna uuid:=gen_random_uuid(); bob uuid:=gen_random_uuid();
  quiet uuid:=gen_random_uuid(); late_user uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid();
  circle uuid:=gen_random_uuid(); moment uuid:=gen_random_uuid();
  first_comment uuid:=gen_random_uuid(); anna_comment uuid:=gen_random_uuid();
  bob_comment uuid:=gen_random_uuid(); host_reply uuid:=gen_random_uuid();
  late_comment uuid:=gen_random_uuid(); uid uuid;
begin
  foreach uid in array array[host,anna,bob,quiet,late_user,outsider] loop
    insert into auth.users(id,email,raw_user_meta_data) values(uid,uid::text||'@comment-test.invalid',
      jsonb_build_object('username','rn_'||substr(uid::text,1,8),'display_name','Reply test'));
    insert into public.terms_acceptances(user_id,version) values(uid,app_private.current_terms_version());
  end loop;
  insert into public.circles(id,name,host_id) values(circle,'Reply test circle',host);
  insert into public.circle_members(circle_id,user_id) select circle,unnest(array[host,anna,bob,quiet,late_user]);
  insert into public.updates(id,sender_id,photo_path,is_quiet,expires_at)
    values(moment,host,host::text||'/reply-test.jpg',true,now()+interval '24 hours');
  insert into public.circle_updates(circle_id,update_id) values(circle,moment);
  insert into public.update_recipients(update_id,recipient_id,is_direct)
    select moment,unnest(array[anna,bob,quiet,late_user]),false;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',host,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform public.add_moment_comment(moment,'First comment',first_comment);
  execute 'reset role';
  assert not exists(select 1 from public.notification_jobs where event_id=first_comment),'An own comment with no participants must not notify';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',anna,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform public.add_moment_comment(moment,'Anna is here',anna_comment);
  perform public.add_moment_comment(moment,'Anna is here',anna_comment);
  execute 'reset role';
  assert (select count(*)=1 from app_private.comment_notification_recipients where comment_id=anna_comment),'Retries must not duplicate recipients';
  assert (select count(*)=1 from public.notification_jobs where event_type='comment' and event_id=anna_comment),'Retries must enqueue only one job';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',bob,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform public.add_moment_comment(moment,'Bob replies',bob_comment);
  execute 'reset role';
  assert (select count(*)=2 from public.comment_push_recipients(bob_comment)),'Owner and previous commenter must receive the reply';
  assert exists(select 1 from public.comment_push_recipients(bob_comment) where recipient_id=anna and is_reply),'Previous commenter needs reply copy';
  assert exists(select 1 from public.comment_push_recipients(bob_comment) where recipient_id=host and not is_reply),'Owner needs photo-owner copy';
  assert not exists(select 1 from public.comment_push_recipients(bob_comment) where recipient_id in (bob,quiet,late_user,outsider)),'Never notify self, non-commenters or outsiders';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',host,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform public.add_moment_comment(moment,'Host replies to everyone',host_reply);
  assert (select count(*)=2 from public.list_comment_notifications()),'Owner keeps normal comment activity without self-alerts';
  execute 'reset role';
  assert (select count(*)=2 from public.comment_push_recipients(host_reply)),'Owner replies must notify both previous commenters';
  assert exists(select 1 from public.notification_jobs where event_type='comment' and event_id=host_reply),'Owner replies need durable delivery too';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',anna,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  assert (select count(*)=2 from public.list_comment_notifications()),'Participant sees replies from Bob and host';
  assert (select bool_and(is_reply) from public.list_comment_notifications()),'Participant activity must say reply';
  execute 'reset role';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',late_user,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform public.add_moment_comment(moment,'Just joining',late_comment);
  assert (select count(*)=0 from public.list_comment_notifications()),'Joining later must not manufacture historic reply alerts';
  execute 'reset role';

  insert into public.blocks(blocker_id,blocked_id) values(anna,bob);
  assert not exists(select 1 from public.comment_push_recipients(bob_comment) where recipient_id=anna),'Blocked pairs must not receive delayed push';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',anna,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  assert not exists(select 1 from public.list_comment_notifications() where id=bob_comment),'Blocked author must disappear from activity';
  execute 'reset role';
  delete from public.blocks where blocker_id=anna and blocked_id=bob;
  delete from public.circle_members where circle_id=circle and user_id=anna;
  assert not exists(select 1 from public.comment_push_recipients(host_reply) where recipient_id=anna),'Leaving the circle must revoke queued reply alerts';
  execute 'set local role authenticated';
  assert (select count(*)=0 from public.list_comment_notifications()),'Leaving the circle must revoke reply activity';
  execute 'reset role';

  update public.updates set expires_at=now()-interval '1 second' where id=moment;
  assert (select count(*)=0 from public.comment_push_recipients(host_reply)),'Expired shared photos must not notify participants';
  assert (select count(*)=0 from public.comment_push_recipients(bob_comment)),'Expired recipient-authored comments must not send delayed alerts';
  assert not has_function_privilege('anon','public.comment_push_recipients(uuid)','EXECUTE'),'Anonymous clients cannot enumerate recipients';
  assert not has_function_privilege('authenticated','public.comment_push_recipients(uuid)','EXECUTE'),'Signed-in clients cannot enumerate recipients';
  assert has_function_privilege('service_role','public.comment_push_recipients(uuid)','EXECUTE'),'Notification worker needs the service-only RPC';
  assert not has_table_privilege('authenticated','app_private.comment_notification_recipients','SELECT'),'Receipts must remain private';
  delete from public.updates where id=moment;
  assert not exists(select 1 from app_private.comment_notification_recipients where comment_id in (first_comment,anna_comment,bob_comment,host_reply,late_comment)),'Photo deletion must cascade notification receipts';
end;
$$;
rollback;
