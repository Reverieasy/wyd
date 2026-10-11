-- Phase 7: legal acceptance, blocking, reporting, connection removal, and
-- participant access hardening.

create table if not exists public.terms_acceptances (
  user_id uuid not null references public.profiles(id) on delete cascade,
  version text not null check (char_length(version) between 1 and 40),
  accepted_at timestamptz not null default now(),
  primary key (user_id, version)
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  update_id uuid references public.updates(id) on delete set null,
  kind text not null check (kind in ('user', 'moment')),
  reason text not null check (reason in ('harassment', 'inappropriate', 'spam', 'impersonation', 'threats', 'other')),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('bug', 'account', 'safety', 'notification', 'other')),
  details text not null check (char_length(btrim(details)) between 3 and 1000),
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.terms_acceptances enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.support_requests enable row level security;

create index if not exists blocks_blocked_id_idx on public.blocks(blocked_id);
create index if not exists reports_reporter_created_idx on public.reports(reporter_id, created_at desc);
create index if not exists reports_reported_created_idx on public.reports(reported_user_id, created_at desc);
create index if not exists reports_update_id_idx on public.reports(update_id) where update_id is not null;
create index if not exists support_requests_user_created_idx on public.support_requests(user_id, created_at desc);

revoke all on public.terms_acceptances, public.blocks, public.reports, public.support_requests from anon, authenticated;
grant all on public.terms_acceptances, public.blocks, public.reports, public.support_requests to service_role;

create or replace function app_private.current_terms_version()
returns text
language sql
immutable
set search_path = ''
as $$ select '2026-09-25'::text; $$;

create or replace function app_private.is_blocked_pair(p_first uuid, p_second uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = p_first and b.blocked_id = p_second)
       or (b.blocker_id = p_second and b.blocked_id = p_first)
  );
$$;

create or replace function app_private.are_connected(p_first uuid, p_second uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_first is not null
    and p_second is not null
    and p_first <> p_second
    and not app_private.is_blocked_pair(p_first, p_second)
    and exists (
      select 1 from public.connections c
      where c.status = 'accepted'
        and ((c.requester_id = p_first and c.addressee_id = p_second)
          or (c.requester_id = p_second and c.addressee_id = p_first))
    );
$$;

create or replace function app_private.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_profile_id = (select auth.uid())
    or exists (
      select 1 from public.blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = p_profile_id
    )
    or (
      not app_private.is_blocked_pair((select auth.uid()), p_profile_id)
      and exists (
        select 1 from public.connections c
        where ((c.requester_id = (select auth.uid()) and c.addressee_id = p_profile_id)
          or (c.addressee_id = (select auth.uid()) and c.requester_id = p_profile_id))
      )
    );
$$;

create or replace function app_private.can_view_update(p_update_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.updates u
    where u.id = p_update_id
      and (
        u.sender_id = (select auth.uid())
        or (
          exists (
            select 1 from public.update_recipients ur
            where ur.update_id = u.id and ur.recipient_id = (select auth.uid())
          )
          and app_private.are_connected(u.sender_id, (select auth.uid()))
        )
      )
  );
$$;

revoke all on function app_private.current_terms_version() from public, anon;
revoke all on function app_private.is_blocked_pair(uuid, uuid) from public, anon;
revoke all on function app_private.are_connected(uuid, uuid) from public, anon;
revoke all on function app_private.can_view_profile(uuid) from public, anon;
revoke all on function app_private.can_view_update(uuid) from public, anon;
grant execute on function app_private.current_terms_version() to authenticated, service_role;
grant execute on function app_private.is_blocked_pair(uuid, uuid) to authenticated, service_role;
grant execute on function app_private.are_connected(uuid, uuid) to authenticated, service_role;
grant execute on function app_private.can_view_profile(uuid) to authenticated, service_role;
grant execute on function app_private.can_view_update(uuid) to authenticated, service_role;

drop policy if exists "Users can view profiles" on public.profiles;
create policy "Users can view relevant profiles"
on public.profiles for select to authenticated
using ((select app_private.can_view_profile(id)));

drop policy if exists "Users can send connection requests" on public.connections;
create policy "Users can send connection requests"
on public.connections for insert to authenticated
with check (
  (select auth.uid()) = requester_id
  and requester_id <> addressee_id
  and not (select app_private.is_blocked_pair(requester_id, addressee_id))
);

drop policy if exists "Users can update received connections" on public.connections;
create policy "Users can update received connections"
on public.connections for update to authenticated
using ((select auth.uid()) = addressee_id)
with check (
  (select auth.uid()) = addressee_id
  and not (select app_private.is_blocked_pair(requester_id, addressee_id))
);

drop policy if exists "Users can view relevant recipients" on public.update_recipients;
create policy "Users can view relevant recipients"
on public.update_recipients for select to authenticated
using ((select app_private.can_view_update(update_id)));

drop policy if exists "Users can view their nudges" on public.nudges;
create policy "Users can view current connection nudges"
on public.nudges for select to authenticated
using (
  ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id)
  and (select app_private.are_connected(sender_id, receiver_id))
);

drop policy if exists "Moment participants can view" on storage.objects;
create policy "Current moment participants can view"
on storage.objects for select to authenticated
using (
  bucket_id = 'moment-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1 from public.updates u
      where u.photo_path = storage.objects.name
        and (select app_private.can_view_update(u.id))
    )
  )
);

revoke insert, update, delete on public.updates from authenticated;
revoke insert, update, delete on public.update_recipients from authenticated;
revoke insert, update, delete on public.nudges from authenticated;
revoke insert, update, delete on public.reactions from authenticated;

create or replace function app_private.enforce_connection_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.requester_id = new.addressee_id then
    raise exception using errcode = 'P0001', message = 'connection_self';
  end if;
  if app_private.is_blocked_pair(new.requester_id, new.addressee_id) then
    raise exception using errcode = 'P0001', message = 'connection_blocked';
  end if;
  return new;
end;
$$;

drop trigger if exists connections_enforce_insert on public.connections;
create trigger connections_enforce_insert
before insert on public.connections
for each row execute function app_private.enforce_connection_insert();

create or replace function app_private.enforce_connection_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then return new; end if;
  if old.addressee_id <> v_uid then
    raise exception using errcode = '42501', message = 'connection_update_not_allowed';
  end if;
  if new.id is distinct from old.id
     or new.requester_id is distinct from old.requester_id
     or new.addressee_id is distinct from old.addressee_id
     or new.relationship_type is distinct from old.relationship_type
     or new.created_at is distinct from old.created_at then
    raise exception using errcode = '42501', message = 'connection_fields_immutable';
  end if;
  if app_private.is_blocked_pair(new.requester_id, new.addressee_id) then
    raise exception using errcode = 'P0001', message = 'connection_blocked';
  end if;
  if old.status <> 'pending' then
    raise exception using errcode = '42501', message = 'connection_already_resolved';
  end if;
  if new.status not in ('accepted', 'blocked') then
    raise exception using errcode = '42501', message = 'invalid_connection_transition';
  end if;
  if new.status = 'accepted' then
    new.accepted_at := coalesce(new.accepted_at, pg_catalog.now());
  else
    new.accepted_at := null;
  end if;
  return new;
end;
$$;

create or replace function app_private.broadcast_connection_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_row public.connections;
begin
  v_row := case when tg_op = 'DELETE' then old else new end;
  if tg_op = 'INSERT' then
    perform realtime.send(
      jsonb_build_object('kind', 'connection', 'entityId', v_row.id, 'status', v_row.status),
      'app_changed', 'user:' || v_row.addressee_id::text, true
    );
  elsif tg_op = 'DELETE' or new.status is distinct from old.status then
    perform realtime.send(
      jsonb_build_object('kind', 'connection', 'entityId', v_row.id, 'status', case when tg_op = 'DELETE' then 'removed' else v_row.status end),
      'app_changed', 'user:' || v_row.requester_id::text, true
    );
    perform realtime.send(
      jsonb_build_object('kind', 'connection', 'entityId', v_row.id, 'status', case when tg_op = 'DELETE' then 'removed' else v_row.status end),
      'app_changed', 'user:' || v_row.addressee_id::text, true
    );
  end if;
  return v_row;
end;
$$;

drop trigger if exists connections_broadcast_change on public.connections;
create trigger connections_broadcast_change
after insert or update of status or delete on public.connections
for each row execute function app_private.broadcast_connection_change();

create or replace function app_private.broadcast_block_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_row public.blocks;
begin
  v_row := case when tg_op = 'DELETE' then old else new end;
  perform realtime.send(jsonb_build_object('kind', 'connection', 'entityId', v_row.blocked_id), 'app_changed', 'user:' || v_row.blocker_id::text, true);
  perform realtime.send(jsonb_build_object('kind', 'connection', 'entityId', v_row.blocker_id), 'app_changed', 'user:' || v_row.blocked_id::text, true);
  return v_row;
end;
$$;

drop trigger if exists blocks_broadcast_change on public.blocks;
create trigger blocks_broadcast_change
after insert or delete on public.blocks
for each row execute function app_private.broadcast_block_change();

create or replace function app_private.get_terms_status_impl()
returns table(current_version text, accepted_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.current_terms_version(), ta.accepted_at
  from (select 1) seed
  left join public.terms_acceptances ta
    on ta.user_id = (select auth.uid())
   and ta.version = app_private.current_terms_version()
  where (select auth.uid()) is not null;
$$;

create or replace function public.get_terms_status()
returns table(current_version text, accepted_at timestamptz)
language sql
set search_path = ''
as $$ select * from app_private.get_terms_status_impl(); $$;

create or replace function app_private.accept_terms_impl(p_version text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_accepted_at timestamptz;
begin
  if v_uid is null then raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED'; end if;
  if p_version is distinct from app_private.current_terms_version() then
    raise exception using errcode = 'P0001', message = 'terms_version_invalid';
  end if;
  insert into public.terms_acceptances(user_id, version)
  values (v_uid, p_version)
  on conflict (user_id, version) do update set accepted_at = public.terms_acceptances.accepted_at
  returning accepted_at into v_accepted_at;
  return v_accepted_at;
end;
$$;

create or replace function public.accept_terms(p_version text)
returns timestamptz
language sql
set search_path = ''
as $$ select app_private.accept_terms_impl(p_version); $$;

create or replace function app_private.find_profile_by_username_impl(p_username text)
returns table(id uuid, username text, display_name text, avatar_path text, created_at timestamptz, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_username text;
begin
  if v_uid is null then raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED'; end if;
  v_username := pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_username, '')), '^@', ''));
  if v_username !~ '^[a-z0-9._]{3,24}$' then return; end if;
  return query
    select p.id, p.username, p.display_name, p.avatar_path, p.created_at, p.updated_at
    from public.profiles p
    where p.username = v_username
      and not app_private.is_blocked_pair(v_uid, p.id)
    limit 1;
end;
$$;

create or replace function public.find_profile_by_username(p_username text)
returns table(id uuid, username text, display_name text, avatar_path text, created_at timestamptz, updated_at timestamptz)
language sql
set search_path = ''
as $$ select * from app_private.find_profile_by_username_impl(p_username); $$;

create or replace function app_private.remove_connection_impl(p_connection_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_count integer;
begin
  if v_uid is null then raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED'; end if;
  delete from public.connections c
  where c.id = p_connection_id and (c.requester_id = v_uid or c.addressee_id = v_uid);
  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception using errcode = 'P0001', message = 'connection_not_found'; end if;
  return true;
end;
$$;

create or replace function public.remove_connection(p_connection_id uuid)
returns boolean
language sql
set search_path = ''
as $$ select app_private.remove_connection_impl(p_connection_id); $$;

create or replace function app_private.block_user_impl(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED'; end if;
  if p_user_id is null or p_user_id = v_uid then raise exception using errcode = 'P0001', message = 'block_invalid_user'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'profile_not_found';
  end if;
  insert into public.blocks(blocker_id, blocked_id) values (v_uid, p_user_id)
  on conflict (blocker_id, blocked_id) do nothing;
  delete from public.connections c
  where (c.requester_id = v_uid and c.addressee_id = p_user_id)
     or (c.requester_id = p_user_id and c.addressee_id = v_uid);
  return true;
end;
$$;

create or replace function public.block_user(p_user_id uuid)
returns boolean
language sql
set search_path = ''
as $$ select app_private.block_user_impl(p_user_id); $$;

create or replace function app_private.unblock_user_impl(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_count integer;
begin
  if v_uid is null then raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED'; end if;
  delete from public.blocks where blocker_id = v_uid and blocked_id = p_user_id;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

create or replace function public.unblock_user(p_user_id uuid)
returns boolean
language sql
set search_path = ''
as $$ select app_private.unblock_user_impl(p_user_id); $$;

create or replace function app_private.list_blocked_users_impl()
returns table(id uuid, username text, display_name text, avatar_path text, created_at timestamptz, updated_at timestamptz, blocked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_path, p.created_at, p.updated_at, b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = (select auth.uid())
  order by b.created_at desc;
$$;

create or replace function public.list_blocked_users()
returns table(id uuid, username text, display_name text, avatar_path text, created_at timestamptz, updated_at timestamptz, blocked_at timestamptz)
language sql
set search_path = ''
as $$ select * from app_private.list_blocked_users_impl(); $$;

create or replace function app_private.report_user_impl(p_user_id uuid, p_reason text, p_details text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_id uuid;
begin
  if v_uid is null then raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED'; end if;
  if p_user_id is null or p_user_id = v_uid then raise exception using errcode = 'P0001', message = 'report_invalid_user'; end if;
  if p_reason not in ('harassment','inappropriate','spam','impersonation','threats','other') then
    raise exception using errcode = 'P0001', message = 'report_invalid_reason';
  end if;
  if p_details is not null and char_length(p_details) > 500 then raise exception using errcode = 'P0001', message = 'report_too_long'; end if;
  if not exists (
    select 1 from public.connections c
    where (c.requester_id = v_uid and c.addressee_id = p_user_id)
       or (c.requester_id = p_user_id and c.addressee_id = v_uid)
  ) then raise exception using errcode = 'P0001', message = 'report_user_unavailable'; end if;
  insert into public.reports(reporter_id, reported_user_id, kind, reason, details)
  values (v_uid, p_user_id, 'user', p_reason, nullif(btrim(p_details), '')) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.report_user(p_user_id uuid, p_reason text, p_details text default null)
returns uuid
language sql
set search_path = ''
as $$ select app_private.report_user_impl(p_user_id, p_reason, p_details); $$;

create or replace function app_private.report_moment_impl(p_update_id uuid, p_reason text, p_details text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_sender uuid; v_id uuid;
begin
  if v_uid is null then raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED'; end if;
  if p_reason not in ('harassment','inappropriate','spam','impersonation','threats','other') then
    raise exception using errcode = 'P0001', message = 'report_invalid_reason';
  end if;
  if p_details is not null and char_length(p_details) > 500 then raise exception using errcode = 'P0001', message = 'report_too_long'; end if;
  select u.sender_id into v_sender
  from public.updates u
  join public.update_recipients ur on ur.update_id = u.id
  where u.id = p_update_id and ur.recipient_id = v_uid and app_private.can_view_update(u.id);
  if v_sender is null then raise exception using errcode = 'P0001', message = 'moment_not_available'; end if;
  insert into public.reports(reporter_id, reported_user_id, update_id, kind, reason, details)
  values (v_uid, v_sender, p_update_id, 'moment', p_reason, nullif(btrim(p_details), '')) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.report_moment(p_update_id uuid, p_reason text, p_details text default null)
returns uuid
language sql
set search_path = ''
as $$ select app_private.report_moment_impl(p_update_id, p_reason, p_details); $$;

create or replace function app_private.submit_support_request_impl(p_category text, p_details text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_id uuid;
begin
  if v_uid is null then raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED'; end if;
  if p_category not in ('bug','account','safety','notification','other') then
    raise exception using errcode = 'P0001', message = 'support_invalid_category';
  end if;
  if char_length(btrim(coalesce(p_details, ''))) not between 3 and 1000 then
    raise exception using errcode = 'P0001', message = 'support_invalid_details';
  end if;
  insert into public.support_requests(user_id, category, details)
  values (v_uid, p_category, btrim(p_details)) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.submit_support_request(p_category text, p_details text)
returns uuid
language sql
set search_path = ''
as $$ select app_private.submit_support_request_impl(p_category, p_details); $$;

-- Terms acceptance is enforced server-side at the Moment creation boundary.
create or replace function app_private.create_update_impl(
  p_photo_path text,
  p_recipient_ids uuid[],
  p_caption text default null,
  p_status_text text default null,
  p_is_quiet boolean default false
)
returns table(id uuid, sender_id uuid, photo_path text, caption varchar, status_text text, is_quiet boolean, created_at timestamptz, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_update_id uuid;
  v_created_at timestamptz;
  v_expires_at timestamptz;
  v_recipients uuid[];
  v_expected integer;
  v_valid integer;
begin
  if v_uid is null then raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from public.terms_acceptances ta
    where ta.user_id = v_uid and ta.version = app_private.current_terms_version()
  ) then raise exception using errcode = 'P0001', message = 'terms_required'; end if;
  if p_photo_path is null or btrim(p_photo_path) = '' or split_part(p_photo_path, '/', 1) <> v_uid::text then
    raise exception using errcode = 'P0001', message = 'invalid_photo_path';
  end if;
  if p_caption is not null and char_length(p_caption) > 150 then raise exception using errcode = 'P0001', message = 'caption_too_long'; end if;
  if p_status_text is not null and char_length(p_status_text) > 40 then raise exception using errcode = 'P0001', message = 'status_too_long'; end if;
  select coalesce(array_agg(distinct x), '{}'::uuid[]) into v_recipients
  from unnest(coalesce(p_recipient_ids, '{}'::uuid[])) as x where x is not null and x <> v_uid;
  v_expected := coalesce(cardinality(v_recipients), 0);
  if v_expected = 0 then raise exception using errcode = 'P0001', message = 'recipient_required'; end if;
  if v_expected > 20 then raise exception using errcode = 'P0001', message = 'too_many_recipients'; end if;
  select count(*)::integer into v_valid
  from unnest(v_recipients) recipient_id
  where app_private.are_connected(v_uid, recipient_id);
  if v_valid <> v_expected then raise exception using errcode = 'P0001', message = 'recipient_not_connected'; end if;
  insert into public.updates(sender_id, photo_path, caption, status_text, is_quiet)
  values (v_uid, p_photo_path, nullif(btrim(p_caption), ''), nullif(btrim(p_status_text), ''), coalesce(p_is_quiet, false))
  returning updates.id, updates.created_at, updates.expires_at into v_update_id, v_created_at, v_expires_at;
  insert into public.update_recipients(update_id, recipient_id)
  select v_update_id, recipient_id from unnest(v_recipients) recipient_id;
  return query select v_update_id, v_uid, p_photo_path, nullif(btrim(p_caption), '')::varchar,
    nullif(btrim(p_status_text), ''), coalesce(p_is_quiet, false), v_created_at, v_expires_at;
end;
$$;

create or replace function app_private.mark_update_seen_impl(p_update_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_seen_at timestamptz;
begin
  if v_uid is null then raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED'; end if;
  if not app_private.can_view_update(p_update_id) then raise exception using errcode = 'P0001', message = 'update_not_shared'; end if;
  update public.update_recipients ur set seen_at = coalesce(ur.seen_at, now())
  where ur.update_id = p_update_id and ur.recipient_id = v_uid returning ur.seen_at into v_seen_at;
  if v_seen_at is null then raise exception using errcode = 'P0001', message = 'update_not_shared'; end if;
  return v_seen_at;
end;
$$;

-- Public wrappers are the only client mutation surface for Phase 7 controls.
revoke all on function public.get_terms_status() from public, anon;
revoke all on function public.accept_terms(text) from public, anon;
revoke all on function public.find_profile_by_username(text) from public, anon;
revoke all on function public.remove_connection(uuid) from public, anon;
revoke all on function public.block_user(uuid) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
revoke all on function public.list_blocked_users() from public, anon;
revoke all on function public.report_user(uuid, text, text) from public, anon;
revoke all on function public.report_moment(uuid, text, text) from public, anon;
revoke all on function public.submit_support_request(text, text) from public, anon;

grant execute on function public.get_terms_status() to authenticated, service_role;
grant execute on function public.accept_terms(text) to authenticated, service_role;
grant execute on function public.find_profile_by_username(text) to authenticated, service_role;
grant execute on function public.remove_connection(uuid) to authenticated, service_role;
grant execute on function public.block_user(uuid) to authenticated, service_role;
grant execute on function public.unblock_user(uuid) to authenticated, service_role;
grant execute on function public.list_blocked_users() to authenticated, service_role;
grant execute on function public.report_user(uuid, text, text) to authenticated, service_role;
grant execute on function public.report_moment(uuid, text, text) to authenticated, service_role;
grant execute on function public.submit_support_request(text, text) to authenticated, service_role;

revoke all on function app_private.get_terms_status_impl() from public, anon;
revoke all on function app_private.accept_terms_impl(text) from public, anon;
revoke all on function app_private.find_profile_by_username_impl(text) from public, anon;
revoke all on function app_private.remove_connection_impl(uuid) from public, anon;
revoke all on function app_private.block_user_impl(uuid) from public, anon;
revoke all on function app_private.unblock_user_impl(uuid) from public, anon;
revoke all on function app_private.list_blocked_users_impl() from public, anon;
revoke all on function app_private.report_user_impl(uuid, text, text) from public, anon;
revoke all on function app_private.report_moment_impl(uuid, text, text) from public, anon;
revoke all on function app_private.submit_support_request_impl(text, text) from public, anon;
grant execute on function app_private.get_terms_status_impl() to authenticated, service_role;
grant execute on function app_private.accept_terms_impl(text) to authenticated, service_role;
grant execute on function app_private.find_profile_by_username_impl(text) to authenticated, service_role;
grant execute on function app_private.remove_connection_impl(uuid) to authenticated, service_role;
grant execute on function app_private.block_user_impl(uuid) to authenticated, service_role;
grant execute on function app_private.unblock_user_impl(uuid) to authenticated, service_role;
grant execute on function app_private.list_blocked_users_impl() to authenticated, service_role;
grant execute on function app_private.report_user_impl(uuid, text, text) to authenticated, service_role;
grant execute on function app_private.report_moment_impl(uuid, text, text) to authenticated, service_role;
grant execute on function app_private.submit_support_request_impl(text, text) to authenticated, service_role;
