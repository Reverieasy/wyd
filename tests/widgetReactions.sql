-- Rollback-only synthetic fixtures; no real user's reaction or notification changes.
begin;
do $$
declare
  sender uuid := gen_random_uuid(); recipient uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
  moment uuid; result_id uuid;
begin
  insert into auth.users(id,email,raw_user_meta_data) values
    (sender,sender::text||'@widget-test.invalid',jsonb_build_object('username','wt_'||substr(sender::text,1,8),'display_name','Test sender')),
    (recipient,recipient::text||'@widget-test.invalid',jsonb_build_object('username','wt_'||substr(recipient::text,1,8),'display_name','Test recipient')),
    (outsider,outsider::text||'@widget-test.invalid',jsonb_build_object('username','wt_'||substr(outsider::text,1,8),'display_name','Test outsider'));
  insert into public.terms_acceptances(user_id,version) values(sender,app_private.current_terms_version()),(recipient,app_private.current_terms_version()),(outsider,app_private.current_terms_version());
  insert into public.connections(requester_id,addressee_id,status,relationship_type) values(sender,recipient,'accepted','friend');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',sender,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  select id into moment from public.create_update_v2(sender::text||'/'||gen_random_uuid()::text||'.jpg',array[recipient],gen_random_uuid(),null,null,false);
  begin perform public.set_reaction(moment,'hug'); raise exception 'Own reaction was allowed';
  exception when others then if sqlerrm <> 'reaction_own_update' then raise; end if; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',recipient,'role','authenticated')::text,true);
  select id into result_id from public.set_reaction(moment,'hug');
  assert result_id is not null,'Hug should be saved';
  perform public.set_reaction(moment,'sparkles');
  assert (select count(*)=1 from public.reactions where update_id=moment and user_id=recipient),'One reaction per person per moment';
  assert (select reaction='sparkles' from public.reactions where id=result_id),'Sparkles should replace hug';
  begin perform public.set_reaction(moment,'invalid'); raise exception 'Invalid reaction was allowed';
  exception when others then if sqlerrm <> 'reaction_invalid' then raise; end if; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated')::text,true);
  begin perform public.set_reaction(moment,'hug'); raise exception 'Outsider reaction was allowed';
  exception when others then if sqlerrm <> 'reaction_update_not_visible' then raise; end if; end;
  execute 'reset role';
  update public.updates set created_at=now()-interval '31 days', expires_at=now()-interval '1 second' where id=moment;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',recipient,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  begin perform public.set_reaction(moment,'hug'); raise exception 'Expired reaction was allowed';
  exception when others then if sqlerrm <> 'reaction_update_not_visible' then raise; end if; end;
  execute 'reset role';
end;
$$;
select 'PASS: hug, sparkle, replacement, own-moment, invalid, outsider and expiration guards' as result;
rollback;
