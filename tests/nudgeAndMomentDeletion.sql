-- Synthetic fixtures only. No accounts, notifications, or photo metadata survive.
begin;
do $$
declare
  sender uuid := gen_random_uuid(); recipient uuid := gen_random_uuid(); other_person uuid := gen_random_uuid();
  first_nudge uuid; moment uuid; guarded_moment uuid; comment_id uuid := gen_random_uuid();
  photo_path text; guarded_path text;
begin
  insert into auth.users(id,email,raw_user_meta_data) values
    (sender,sender::text||'@moment-test.invalid',jsonb_build_object('username','mt_'||substr(sender::text,1,8),'display_name','Test sender')),
    (recipient,recipient::text||'@moment-test.invalid',jsonb_build_object('username','mt_'||substr(recipient::text,1,8),'display_name','Test recipient')),
    (other_person,other_person::text||'@moment-test.invalid',jsonb_build_object('username','mt_'||substr(other_person::text,1,8),'display_name','Test other'));
  insert into public.terms_acceptances(user_id,version) values(sender,app_private.current_terms_version()),(recipient,app_private.current_terms_version());
  insert into public.connections(requester_id,addressee_id,status,relationship_type) values(sender,recipient,'accepted','friend');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',sender,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  select id into first_nudge from public.send_nudge(recipient);
  begin perform public.send_nudge(recipient); raise exception 'Immediate nudge was allowed';
  exception when others then if sqlerrm<>'nudge_cooldown' then raise; end if; end;
  execute 'reset role';
  update public.nudges set created_at=now()-interval '9.999 seconds' where id=first_nudge;
  execute 'set local role authenticated';
  begin perform public.send_nudge(recipient); raise exception 'Nudge before 10 seconds was allowed';
  exception when others then if sqlerrm<>'nudge_cooldown' then raise; end if; end;
  execute 'reset role';
  update public.nudges set created_at=now()-interval '10 seconds' where id=first_nudge;
  execute 'set local role authenticated';
  perform public.send_nudge(recipient);

  photo_path := sender::text||'/'||gen_random_uuid()::text||'.jpg';
  guarded_path := sender::text||'/'||gen_random_uuid()::text||'.jpg';
  select id into moment from public.create_update_v2(photo_path,array[recipient],gen_random_uuid(),null,null,false);
  select id into guarded_moment from public.create_update_v2(guarded_path,array[recipient],gen_random_uuid(),null,null,false);
  execute 'reset role';
  -- Metadata-only fixture; no real binary is created or deleted by this test.
  insert into storage.objects(bucket_id,name) values('moment-photos',guarded_path);
  execute 'set local role authenticated';
  perform set_config('storage.operation','storage.object.delete_many',true);
  assert (select count(*)=1 from storage.objects where bucket_id='moment-photos' and name=guarded_path),'Owner needs visibility for Storage API deletion';
  perform set_config('storage.operation','storage.object.sign',true);
  assert (select count(*)=0 from storage.objects where bucket_id='moment-photos' and name=guarded_path),'Deletion must not re-enable signed photo URLs';
  begin perform public.delete_own_moment(guarded_moment); raise exception 'Deleted metadata before removing the binary';
  exception when others then if sqlerrm<>'moment_photo_delete_required' then raise; end if; end;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',recipient,'role','authenticated')::text,true);
  perform public.add_moment_comment(moment,'Test comment',comment_id);
  assert public.delete_own_moment(moment)=false,'A recipient must not delete the sender moment';
  perform set_config('storage.operation','storage.object.delete_many',true);
  assert (select count(*)=0 from storage.objects where bucket_id='moment-photos' and name=guarded_path),'Recipients must not acquire Storage delete visibility';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',other_person,'role','authenticated')::text,true);
  assert public.delete_own_moment(moment)=false,'An outsider must not delete the sender moment';
  execute 'set local role anon';
  begin perform public.delete_own_moment(moment); raise exception 'Anonymous deletion was allowed';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',sender,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  assert public.delete_own_moment(moment),'Owner deletion must succeed once the storage object is gone';
  assert public.delete_own_moment(moment)=false,'Repeating deletion must be idempotent';
  execute 'reset role';
  assert not exists(select 1 from public.updates where id=moment),'Moment still exists';
  assert not exists(select 1 from public.moment_comments where update_id=moment),'Comments did not cascade';
  assert not exists(select 1 from public.update_recipients where update_id=moment),'Recipient links did not cascade';
end;
$$;
select 'PASS: 10-second boundary, owned deletion, Storage visibility, access isolation and comment cascade' as result;
rollback;
