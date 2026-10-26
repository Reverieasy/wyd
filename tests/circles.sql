-- Runs against PostgreSQL in one transaction. No accounts, messages or photos survive.
begin;
do $$
declare
  host uuid := pg_catalog.gen_random_uuid();
  member uuid := pg_catalog.gen_random_uuid();
  pending_user uuid := pg_catalog.gen_random_uuid();
  outsider uuid := pg_catalog.gen_random_uuid();
  circle uuid; invite text; request uuid; moment uuid;
  request_key uuid := pg_catalog.gen_random_uuid();
  comment_id uuid := pg_catalog.gen_random_uuid();
  reply_id uuid := pg_catalog.gen_random_uuid();
  result jsonb;
begin
  insert into auth.users(id,email,raw_user_meta_data) values
    (host,host::text||'@circle-test.invalid',jsonb_build_object('username','ct_'||substr(host::text,1,8),'display_name','Test host')),
    (member,member::text||'@circle-test.invalid',jsonb_build_object('username','ct_'||substr(member::text,1,8),'display_name','Test member')),
    (pending_user,pending_user::text||'@circle-test.invalid',jsonb_build_object('username','ct_'||substr(pending_user::text,1,8),'display_name','Test pending')),
    (outsider,outsider::text||'@circle-test.invalid',jsonb_build_object('username','ct_'||substr(outsider::text,1,8),'display_name','Test outsider'));
  insert into public.terms_acceptances(user_id,version) values(host,app_private.current_terms_version()),(member,app_private.current_terms_version());

  perform set_config('request.jwt.claims',jsonb_build_object('sub',host,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  result := public.circle_action('create',p_name=>'The test crew');
  circle := (result->>'id')::uuid;
  assert result->>'name'='The test crew','Circle name was not saved';
  assert (select count(*)=1 from public.circle_members where circle_id=circle and user_id=host),'Creator must be the first member';
  invite := public.circle_action('invite',p_circle_id=>circle)->>'code';
  assert length(invite)=32,'Invite code needs sufficient entropy';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated')::text,true);
  result := public.circle_action('request_join',p_code=>invite);
  assert result->>'status'='pending','Invites must request approval, not auto-join';
  assert (select count(*)=0 from public.circle_members where circle_id=circle),'Pending users must not read members';
  select id into request from public.circle_join_requests where circle_id=circle and requester_id=member;
  begin
    perform public.circle_action('approve_join',p_circle_id=>circle,p_request_id=>request);
    raise exception 'Non-host approved a join request';
  exception when others then
    if sqlerrm<>'circle_host_required' then raise; end if;
  end;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',host,'role','authenticated')::text,true);
  perform public.circle_action('approve_join',p_circle_id=>circle,p_request_id=>request);
  assert (select count(*)=2 from public.circle_members where circle_id=circle),'Host approval must create membership';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',pending_user,'role','authenticated')::text,true);
  perform public.circle_action('request_join',p_code=>invite);

  perform set_config('request.jwt.claims',jsonb_build_object('sub',host,'role','authenticated')::text,true);
  select id into moment from public.create_circle_update(host::text||'/test.jpg','{}',array[circle],request_key,'Test moment','Studying',true);
  assert (select count(*)=1 from public.update_recipients where update_id=moment),'Only the approved member receives the photo';
  assert (select bool_and(not is_direct) from public.update_recipients where update_id=moment),'A circle-only share must preserve its source';
  assert (select id=moment from public.create_circle_update(host::text||'/test.jpg','{}',array[circle],request_key,'Test moment','Studying',true)),'Retries must be idempotent';

  assert public.add_moment_comment(moment,'Hello crew',comment_id)=comment_id,'Owner must be able to comment';
  assert public.add_moment_comment(moment,'Hello crew',comment_id)=comment_id,'Comment retries must be idempotent';
  assert (select count(*)=1 from public.list_moment_comments(moment)),'A retry must not duplicate a comment';
  begin
    perform public.add_moment_comment(moment,'   ',pg_catalog.gen_random_uuid());
    raise exception 'Blank comment accepted';
  exception when others then if sqlerrm<>'comment_invalid' then raise; end if; end;
  begin
    perform public.add_moment_comment(moment,repeat('x',501),pg_catalog.gen_random_uuid());
    raise exception 'Oversized comment accepted';
  exception when others then if sqlerrm<>'comment_invalid' then raise; end if; end;
  begin
    insert into public.moment_comments(update_id,user_id,body) values(moment,outsider,'Forged author');
    raise exception 'Direct insert bypassed author validation';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated')::text,true);
  perform public.add_moment_comment(moment,'Looks good!',reply_id);
  assert (select count(*)=2 from public.list_moment_comments(moment)),'Approved non-close member must see the thread';
  assert (select display_name='Test host' from public.list_moment_comments(moment) where id=comment_id),'Thread must include author names';
  begin
    perform public.delete_moment_comment(moment,comment_id);
    raise exception 'Deleted another author comment';
  exception when others then if sqlerrm<>'comment_delete_forbidden' then raise; end if; end;
  perform public.delete_moment_comment(moment,reply_id);
  assert (select count(*)=1 from public.list_moment_comments(moment)),'Author must be able to delete a comment';
  perform public.add_moment_comment(moment,'Another reply',pg_catalog.gen_random_uuid());
  perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated')::text,true);
  assert (select count(*)=0 from public.moment_comments where update_id=moment),'Unrelated people must not read comments';
  begin
    perform public.list_moment_comments(moment);
    raise exception 'Outsider read thread through RPC';
  exception when others then if sqlerrm<>'comment_moment_unavailable' then raise; end if; end;
  begin
    perform public.add_moment_comment(moment,'Intrusion',pg_catalog.gen_random_uuid());
    raise exception 'Outsider posted a comment';
  exception when others then if sqlerrm not in ('comment_moment_unavailable','terms_required') then raise; end if; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',host,'role','authenticated')::text,true);
  execute 'reset role';
  insert into public.blocks(blocker_id,blocked_id) values(host,member);
  execute 'set local role authenticated';
  assert (select count(*)=1 from public.list_moment_comments(moment)),'Blocked authors must be hidden';
  execute 'reset role';
  delete from public.blocks where blocker_id=host and blocked_id=member;
  execute 'set local role authenticated';

  execute 'reset role';
  update public.updates set created_at=now()-interval '31 days' where id=moment;
  execute 'set local role authenticated';
  assert (select count(*)=0 from public.updates where id=moment),'Even the owner must lose access after 30 days';
  assert (select count(*)=0 from public.moment_comments where update_id=moment),'Retention must also hide the comments';
  execute 'reset role';
  update public.updates set created_at=now() where id=moment;
  execute 'set local role authenticated';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',pending_user,'role','authenticated')::text,true);
  assert (select count(*)=0 from public.updates where id=moment),'Pending joiners must not see circle photos';
  assert (select count(*)=0 from public.circle_updates where update_id=moment),'Pending joiners must not read photo metadata';
  assert (select count(*)=0 from public.moment_comments where update_id=moment),'Pending joiners must not read comments';
  begin
    perform public.create_circle_update(pending_user::text||'/test.jpg','{}',array[circle],pg_catalog.gen_random_uuid());
    raise exception 'Pending joiner shared to a circle';
  exception when others then
    if sqlerrm not in ('circle_member_required','terms_required') then raise; end if;
  end;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated')::text,true);
  assert (select count(*)=1 from public.updates where id=moment),'Approved non-close people must see a circle share';
  assert (select count(*)=1 from public.profiles where id=host),'Circle member names must be readable';
  begin
    insert into public.circle_members(circle_id,user_id) values(circle,outsider);
    raise exception 'Client bypassed host approval';
  exception when insufficient_privilege then null;
  end;
  perform public.circle_action('leave',p_circle_id=>circle);
  assert (select count(*)=0 from public.updates where id=moment),'Leaving must revoke circle-only photos';
  assert (select count(*)=0 from public.moment_comments where update_id=moment),'Leaving must revoke the thread too';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated')::text,true);
  assert (select count(*)=0 from public.circles where id=circle),'Uninvited outsiders must not discover a circle';
  assert (select count(*)=0 from public.circle_join_requests where circle_id=circle),'Only the host and requester see join requests';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',host,'role','authenticated')::text,true);
  perform public.circle_action('rotate_invite',p_circle_id=>circle);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated')::text,true);
  begin
    perform public.circle_action('preview',p_code=>invite);
    raise exception 'Old invite still worked after replacement';
  exception when others then
    if sqlerrm<>'circle_invite_invalid' then raise; end if;
  end;
  execute 'reset role';
  assert not has_function_privilege('anon','public.add_moment_comment(uuid,text,uuid)','EXECUTE'),'Anonymous posting must be denied';
  assert not has_table_privilege('authenticated','public.moment_comments','INSERT'),'Posting must use the validated RPC';
  delete from public.updates where id=moment;
  assert (select count(*)=0 from public.moment_comments where update_id=moment),'Deleting a photo must cascade to its comments';
end;
$$;
rollback;
