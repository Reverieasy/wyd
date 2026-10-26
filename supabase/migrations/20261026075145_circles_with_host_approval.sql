create table public.circles (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  host_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index circles_host_id_idx on public.circles(host_id);
create table public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index circle_members_user_id_idx on public.circle_members(user_id, circle_id);
create table public.circle_join_requests (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (circle_id, requester_id)
);
create index circle_requests_requester_idx on public.circle_join_requests(requester_id);
create index circle_requests_pending_idx on public.circle_join_requests(circle_id, created_at) where status = 'pending';
create table app_private.circle_invites (
  circle_id uuid primary key references public.circles(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null
);
alter table app_private.circle_invites enable row level security;
revoke all on app_private.circle_invites from public, anon, authenticated;
create table public.circle_updates (
  circle_id uuid not null references public.circles(id) on delete cascade,
  update_id uuid not null references public.updates(id) on delete cascade,
  primary key (circle_id, update_id)
);
create index circle_updates_update_id_idx on public.circle_updates(update_id);
-- Preserve an explicit direct share independently of circle membership.
alter table public.update_recipients add column is_direct boolean not null default true;

create function app_private.is_circle_member(p_circle_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.circle_members m where m.circle_id = p_circle_id and m.user_id = (select auth.uid())
  );
$$;
create function app_private.is_circle_host(p_circle_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.circles c where c.id = p_circle_id and c.host_id = (select auth.uid()));
$$;
create function app_private.can_read_circle(p_circle_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.is_circle_member(p_circle_id) or app_private.is_circle_host(p_circle_id)
    or exists (select 1 from public.circle_join_requests r where r.circle_id = p_circle_id
      and r.requester_id = (select auth.uid()) and r.status in ('pending','declined'));
$$;
create function app_private.share_circle(p_first uuid, p_second uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_first is not null and p_second is not null
    and not app_private.is_blocked_pair(p_first,p_second)
    and exists (select 1 from public.circle_members a join public.circle_members b using(circle_id)
      where a.user_id = p_first and b.user_id = p_second);
$$;
revoke all on function app_private.is_circle_member(uuid), app_private.is_circle_host(uuid), app_private.can_read_circle(uuid), app_private.share_circle(uuid,uuid) from public, anon;
grant execute on function app_private.is_circle_member(uuid), app_private.is_circle_host(uuid), app_private.can_read_circle(uuid), app_private.share_circle(uuid,uuid) to authenticated;

alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_join_requests enable row level security;
alter table public.circle_updates enable row level security;
revoke all on public.circles, public.circle_members, public.circle_join_requests, public.circle_updates from anon, authenticated;
grant select on public.circles, public.circle_members, public.circle_join_requests, public.circle_updates to authenticated;
create policy "Read own circles and requests" on public.circles for select to authenticated using ((select app_private.can_read_circle(id)));
create policy "Approved members read circle membership" on public.circle_members for select to authenticated using ((select app_private.is_circle_member(circle_id)));
create policy "Host and requester read join requests" on public.circle_join_requests for select to authenticated using (requester_id = (select auth.uid()) or (select app_private.is_circle_host(circle_id)));

-- Keep existing profile visibility, adding approved peers and host review only.
create or replace function app_private.can_view_profile(p_profile_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_profile_id = (select auth.uid())
    or exists (select 1 from public.blocks b where b.blocker_id = (select auth.uid()) and b.blocked_id = p_profile_id)
    or (not app_private.is_blocked_pair((select auth.uid()),p_profile_id) and (
      exists (select 1 from public.connections c where (c.requester_id = (select auth.uid()) and c.addressee_id = p_profile_id)
        or (c.addressee_id = (select auth.uid()) and c.requester_id = p_profile_id))
      or app_private.share_circle((select auth.uid()),p_profile_id)
      or exists (select 1 from public.circle_join_requests r join public.circles c on c.id=r.circle_id
        where c.host_id=(select auth.uid()) and r.requester_id=p_profile_id and r.status='pending')
    ));
$$;

-- A code grants permission to request access, never membership or photo access.
create function app_private.circle_action_impl(
  p_action text, p_circle_id uuid default null, p_name text default null,
  p_code text default null, p_request_id uuid default null, p_user_id uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_circle public.circles%rowtype;
  v_request public.circle_join_requests%rowtype;
  v_invite app_private.circle_invites%rowtype;
  v_code text := lower(regexp_replace(coalesce(p_code,''),'[\s-]','','g'));
begin
  if v_uid is null or not exists(select 1 from public.profiles where id=v_uid) then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('circle-user:'||v_uid::text,0));
  if p_action='create' then
    if char_length(btrim(coalesce(p_name,''))) not between 1 and 40 then raise exception 'circle_name_invalid'; end if;
    if (select count(*) from public.circles where host_id=v_uid)>=20 then raise exception 'circle_limit'; end if;
    insert into public.circles(name,host_id) values(btrim(p_name),v_uid) returning * into v_circle;
    insert into public.circle_members(circle_id,user_id) values(v_circle.id,v_uid);
    return to_jsonb(v_circle);
  end if;
  if p_action in ('preview','request_join') then
    if v_code !~ '^[a-f0-9]{32}$' then raise exception 'circle_invite_invalid'; end if;
    select c.* into v_circle from public.circles c join app_private.circle_invites i on i.circle_id=c.id
      where i.code=v_code and i.expires_at>now() for update of c;
    if not found or app_private.is_blocked_pair(v_uid,v_circle.host_id) then raise exception 'circle_invite_invalid'; end if;
    if p_action='preview' then
      return jsonb_build_object('circle_id',v_circle.id,'name',v_circle.name,'host_id',v_circle.host_id,
        'host_name',(select display_name from public.profiles where id=v_circle.host_id),
        'member_count',(select count(*) from public.circle_members where circle_id=v_circle.id),
        'status',case when app_private.is_circle_member(v_circle.id) then 'member' else coalesce((select status from public.circle_join_requests where circle_id=v_circle.id and requester_id=v_uid),'none') end);
    end if;
    if app_private.is_circle_member(v_circle.id) then return jsonb_build_object('circle_id',v_circle.id,'status','member'); end if;
    select * into v_request from public.circle_join_requests where circle_id=v_circle.id and requester_id=v_uid;
    if found and v_request.status='pending' then return jsonb_build_object('circle_id',v_circle.id,'status','pending'); end if;
    if found and v_request.status='declined' and v_request.decided_at>now()-interval '1 day' then raise exception 'circle_request_declined'; end if;
    if (select count(*) from public.circle_join_requests where requester_id=v_uid and status='pending')>=20 then raise exception 'circle_request_limit'; end if;
    insert into public.circle_join_requests(circle_id,requester_id) values(v_circle.id,v_uid)
      on conflict(circle_id,requester_id) do update set status='pending',created_at=now(),decided_at=null;
    return jsonb_build_object('circle_id',v_circle.id,'status','pending');
  end if;
  select * into v_circle from public.circles where id=p_circle_id for update;
  if not found then raise exception 'circle_not_found'; end if;
  if p_action in ('invite','rotate_invite','leave') then
    if not app_private.is_circle_member(v_circle.id) then raise exception 'circle_member_required'; end if;
  elsif v_circle.host_id<>v_uid then raise exception 'circle_host_required'; end if;
  if p_action in ('invite','rotate_invite') then
    if p_action='rotate_invite' and v_circle.host_id<>v_uid then raise exception 'circle_host_required'; end if;
    select * into v_invite from app_private.circle_invites where circle_id=v_circle.id;
    if not found or v_invite.expires_at<=now() or p_action='rotate_invite' then
      insert into app_private.circle_invites(circle_id,code,expires_at)
        values(v_circle.id,replace(pg_catalog.gen_random_uuid()::text,'-',''),now()+interval '7 days')
        on conflict(circle_id) do update set code=excluded.code,expires_at=excluded.expires_at returning * into v_invite;
    end if;
    return jsonb_build_object('circle_id',v_circle.id,'code',v_invite.code,'expires_at',v_invite.expires_at);
  elsif p_action='rename' then
    if char_length(btrim(coalesce(p_name,''))) not between 1 and 40 then raise exception 'circle_name_invalid'; end if;
    update public.circles set name=btrim(p_name) where id=v_circle.id;
  elsif p_action in ('approve_join','decline_join') then
    select * into v_request from public.circle_join_requests where id=p_request_id and circle_id=v_circle.id for update;
    if not found or v_request.status<>'pending' then raise exception 'circle_request_not_pending'; end if;
    if p_action='approve_join' then
      if app_private.is_blocked_pair(v_uid,v_request.requester_id) then raise exception 'blocked_relationship'; end if;
      if (select count(*) from public.circle_members where circle_id=v_circle.id)>=50 then raise exception 'circle_full'; end if;
      insert into public.circle_members(circle_id,user_id) values(v_circle.id,v_request.requester_id) on conflict do nothing;
    end if;
    update public.circle_join_requests set status=case when p_action='approve_join' then 'approved' else 'declined' end,decided_at=now() where id=v_request.id;
  elsif p_action='leave' then
    if v_circle.host_id=v_uid then raise exception 'circle_host_cannot_leave'; end if;
    delete from public.circle_members where circle_id=v_circle.id and user_id=v_uid;
  elsif p_action='remove_member' then
    if p_user_id is null or p_user_id=v_circle.host_id then raise exception 'circle_cannot_remove_host'; end if;
    delete from public.circle_members where circle_id=v_circle.id and user_id=p_user_id;
    update public.circle_join_requests set status='declined',decided_at=now() where circle_id=v_circle.id and requester_id=p_user_id;
  elsif p_action='delete' then
    delete from public.circles where id=v_circle.id;
  else raise exception 'circle_action_invalid'; end if;
  return jsonb_build_object('circle_id',v_circle.id,'success',true);
end;
$$;
revoke all on function app_private.circle_action_impl(text,uuid,text,text,uuid,uuid) from public, anon;
grant execute on function app_private.circle_action_impl(text,uuid,text,text,uuid,uuid) to authenticated;
create function public.circle_action(p_action text,p_circle_id uuid default null,p_name text default null,p_code text default null,p_request_id uuid default null,p_user_id uuid default null)
returns jsonb language sql security invoker set search_path='' as $$ select app_private.circle_action_impl(p_action,p_circle_id,p_name,p_code,p_request_id,p_user_id); $$;
revoke all on function public.circle_action(text,uuid,text,text,uuid,uuid) from public, anon;
grant execute on function public.circle_action(text,uuid,text,text,uuid,uuid) to authenticated;

create or replace function app_private.can_view_update(p_update_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.updates u where u.id=p_update_id and (
    u.sender_id=(select auth.uid()) or (
      not app_private.is_blocked_pair(u.sender_id,(select auth.uid()))
      and exists(select 1 from public.update_recipients r where r.update_id=u.id and r.recipient_id=(select auth.uid())
      and ((r.is_direct and app_private.are_connected(u.sender_id,(select auth.uid()))) or exists(
        select 1 from public.circle_updates cu
        join public.circle_members sender on sender.circle_id=cu.circle_id and sender.user_id=u.sender_id
        join public.circle_members viewer on viewer.circle_id=cu.circle_id and viewer.user_id=(select auth.uid())
        where cu.update_id=u.id
      )))
    )
  ));
$$;
create policy "Read authorized circle moment links" on public.circle_updates for select to authenticated
  using ((select app_private.is_circle_member(circle_id)) and (select app_private.can_view_update(update_id)));

create function app_private.create_circle_update_impl(p_photo_path text,p_recipient_ids uuid[],p_circle_ids uuid[],p_client_request_id uuid,p_caption text default null,p_status_text text default null,p_is_quiet boolean default false)
returns setof public.updates language plpgsql security definer set search_path='' as $$
declare
  v_uid uuid := (select auth.uid()); v_circles uuid[]; v_recipients uuid[]; v_row public.updates%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_client_request_id is null then raise exception 'request_id_required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text||':'||p_client_request_id::text,0));
  return query select * from public.updates where sender_id=v_uid and client_request_id=p_client_request_id;
  if found then return; end if;
  if not app_private.has_current_terms(v_uid) then raise exception 'terms_required'; end if;
  if p_photo_path is null or split_part(p_photo_path,'/',1)<>v_uid::text or btrim(p_photo_path)='' then raise exception 'invalid_photo_path'; end if;
  if char_length(p_caption)>150 then raise exception 'caption_too_long'; end if;
  if char_length(p_status_text)>40 then raise exception 'status_too_long'; end if;
  select coalesce(array_agg(distinct x),'{}'::uuid[]) into v_circles from unnest(coalesce(p_circle_ids,'{}'::uuid[])) x where x is not null;
  if cardinality(v_circles)=0 or cardinality(v_circles)>10 then raise exception 'circle_member_required'; end if;
  perform 1 from public.circles where id=any(v_circles) order by id for share;
  if exists(select 1 from unnest(v_circles) c where not app_private.is_circle_member(c)) then raise exception 'circle_member_required'; end if;
  if exists(select 1 from unnest(coalesce(p_recipient_ids,'{}'::uuid[])) r where r is not null and r<>v_uid and not app_private.are_connected(v_uid,r)) then raise exception 'recipient_not_connected'; end if;
  select coalesce(array_agg(distinct recipient),'{}'::uuid[]) into v_recipients from (
    select unnest(coalesce(p_recipient_ids,'{}'::uuid[])) recipient
    union select user_id from public.circle_members where circle_id=any(v_circles)
  ) everyone where recipient is not null and recipient<>v_uid and not app_private.is_blocked_pair(v_uid,recipient);
  if cardinality(v_recipients)=0 then raise exception 'recipient_required'; end if;
  if cardinality(v_recipients)>100 then raise exception 'too_many_recipients'; end if;
  insert into public.updates(sender_id,photo_path,caption,status_text,is_quiet,client_request_id)
    values(v_uid,p_photo_path,nullif(btrim(p_caption),''),nullif(btrim(p_status_text),''),coalesce(p_is_quiet,false),p_client_request_id) returning * into v_row;
  insert into public.update_recipients(update_id,recipient_id,is_direct)
    select v_row.id,r,r=any(coalesce(p_recipient_ids,'{}'::uuid[])) from unnest(v_recipients) r;
  insert into public.circle_updates(circle_id,update_id) select unnest(v_circles),v_row.id;
  return next v_row;
end;
$$;
revoke all on function app_private.create_circle_update_impl(text,uuid[],uuid[],uuid,text,text,boolean) from public, anon;
grant execute on function app_private.create_circle_update_impl(text,uuid[],uuid[],uuid,text,text,boolean) to authenticated;
create function public.create_circle_update(p_photo_path text,p_recipient_ids uuid[],p_circle_ids uuid[],p_client_request_id uuid,p_caption text default null,p_status_text text default null,p_is_quiet boolean default false)
returns setof public.updates language sql security invoker set search_path='' as $$
  select * from app_private.create_circle_update_impl(p_photo_path,p_recipient_ids,p_circle_ids,p_client_request_id,p_caption,p_status_text,p_is_quiet);
$$;
revoke all on function public.create_circle_update(text,uuid[],uuid[],uuid,text,text,boolean) from public, anon;
grant execute on function public.create_circle_update(text,uuid[],uuid[],uuid,text,text,boolean) to authenticated;
notify pgrst,'reload schema';
