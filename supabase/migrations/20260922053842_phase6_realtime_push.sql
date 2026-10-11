create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default true,
  moments boolean not null default true,
  nudges boolean not null default true,
  reactions boolean not null default true,
  connections boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('android', 'ios')),
  device_identifier text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('moment', 'nudge', 'reaction', 'connection_request', 'connection_accepted')),
  event_id uuid not null,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  push_token_id uuid not null references public.push_tokens(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'invalid_token')),
  expo_ticket_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_type, event_id, push_token_id)
);

create index if not exists push_tokens_user_enabled_idx
  on public.push_tokens (user_id, enabled);

create index if not exists notification_deliveries_recipient_created_idx
  on public.notification_deliveries (recipient_id, created_at desc);

alter table public.notification_preferences enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists "Users can view notification preferences" on public.notification_preferences;
create policy "Users can view notification preferences"
on public.notification_preferences for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create notification preferences" on public.notification_preferences;
create policy "Users can create notification preferences"
on public.notification_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update notification preferences" on public.notification_preferences;
create policy "Users can update notification preferences"
on public.notification_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view their push tokens" on public.push_tokens;
create policy "Users can view their push tokens"
on public.push_tokens for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.push_tokens from anon, authenticated;
grant select on public.push_tokens to authenticated;
revoke all on public.notification_deliveries from anon, authenticated;
grant select, insert, update on public.notification_preferences to authenticated;

create or replace function app_private.phase6_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function app_private.phase6_set_updated_at();

drop trigger if exists push_tokens_set_updated_at on public.push_tokens;
create trigger push_tokens_set_updated_at
before update on public.push_tokens
for each row execute function app_private.phase6_set_updated_at();

drop trigger if exists notification_deliveries_set_updated_at on public.notification_deliveries;
create trigger notification_deliveries_set_updated_at
before update on public.notification_deliveries
for each row execute function app_private.phase6_set_updated_at();

insert into public.notification_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function app_private.create_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_create_notification_preferences on public.profiles;
create trigger profiles_create_notification_preferences
after insert on public.profiles
for each row execute function app_private.create_notification_preferences();

create or replace function public.register_push_token(
  p_expo_push_token text,
  p_platform text,
  p_device_identifier text default null
)
returns table (
  id uuid,
  expo_push_token text,
  platform text,
  enabled boolean,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_platform not in ('android', 'ios') then
    raise exception 'INVALID_PLATFORM';
  end if;
  if p_expo_push_token is null
     or p_expo_push_token !~ '^(Expo(nent)?PushToken)\[[A-Za-z0-9_-]+\]$' then
    raise exception 'INVALID_PUSH_TOKEN';
  end if;

  return query
  insert into public.push_tokens as token (
    user_id,
    expo_push_token,
    platform,
    device_identifier,
    enabled,
    last_seen_at
  ) values (
    v_user_id,
    p_expo_push_token,
    p_platform,
    nullif(trim(p_device_identifier), ''),
    true,
    now()
  )
  on conflict on constraint push_tokens_expo_push_token_key do update
  set user_id = excluded.user_id,
      platform = excluded.platform,
      device_identifier = excluded.device_identifier,
      enabled = true,
      last_seen_at = now()
  returning token.id, token.expo_push_token, token.platform, token.enabled, token.last_seen_at;
end;
$$;

create or replace function public.disable_push_token(p_expo_push_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  update public.push_tokens
  set enabled = false
  where user_id = v_user_id
    and expo_push_token = p_expo_push_token
    and enabled = true;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

revoke all on function public.register_push_token(text, text, text) from public, anon;
grant execute on function public.register_push_token(text, text, text) to authenticated;
revoke all on function public.disable_push_token(text) from public, anon;
grant execute on function public.disable_push_token(text) to authenticated;

drop policy if exists "Users can receive their private broadcasts" on realtime.messages;
create policy "Users can receive their private broadcasts"
on realtime.messages for select to authenticated
using (
  extension = 'broadcast'
  and (select realtime.topic()) = 'user:' || (select auth.uid())::text
);

create or replace function app_private.broadcast_moment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid;
begin
  if tg_op = 'INSERT' then
    perform realtime.send(
      jsonb_build_object('kind', 'moment', 'entityId', new.update_id),
      'app_changed',
      'user:' || new.recipient_id::text,
      true
    );
  elsif new.seen_at is distinct from old.seen_at and new.seen_at is not null then
    select sender_id into v_sender_id from public.updates where id = new.update_id;
    if v_sender_id is not null then
      perform realtime.send(
        jsonb_build_object('kind', 'seen', 'entityId', new.update_id),
        'app_changed',
        'user:' || v_sender_id::text,
        true
      );
    end if;
  end if;
  return new;
end;
$$;

create or replace function app_private.broadcast_reaction_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid;
begin
  select sender_id into v_sender_id from public.updates where id = new.update_id;
  if v_sender_id is not null and v_sender_id <> new.user_id then
    perform realtime.send(
      jsonb_build_object('kind', 'reaction', 'entityId', new.id, 'updateId', new.update_id),
      'app_changed',
      'user:' || v_sender_id::text,
      true
    );
  end if;
  return new;
end;
$$;

create or replace function app_private.broadcast_nudge_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform realtime.send(
      jsonb_build_object('kind', 'nudge', 'entityId', new.id),
      'app_changed',
      'user:' || new.receiver_id::text,
      true
    );
  elsif new.status is distinct from old.status then
    perform realtime.send(
      jsonb_build_object('kind', 'nudge_response', 'entityId', new.id, 'updateId', new.response_update_id),
      'app_changed',
      'user:' || new.sender_id::text,
      true
    );
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
begin
  if tg_op = 'INSERT' then
    perform realtime.send(
      jsonb_build_object('kind', 'connection', 'entityId', new.id, 'status', new.status),
      'app_changed',
      'user:' || new.addressee_id::text,
      true
    );
  elsif new.status is distinct from old.status then
    perform realtime.send(
      jsonb_build_object('kind', 'connection', 'entityId', new.id, 'status', new.status),
      'app_changed',
      'user:' || new.requester_id::text,
      true
    );
    perform realtime.send(
      jsonb_build_object('kind', 'connection', 'entityId', new.id, 'status', new.status),
      'app_changed',
      'user:' || new.addressee_id::text,
      true
    );
  end if;
  return new;
end;
$$;

drop trigger if exists update_recipients_broadcast_change on public.update_recipients;
create trigger update_recipients_broadcast_change
after insert or update of seen_at on public.update_recipients
for each row execute function app_private.broadcast_moment_change();

drop trigger if exists reactions_broadcast_change on public.reactions;
create trigger reactions_broadcast_change
after insert or update of reaction on public.reactions
for each row execute function app_private.broadcast_reaction_change();

drop trigger if exists nudges_broadcast_change on public.nudges;
create trigger nudges_broadcast_change
after insert or update of status on public.nudges
for each row execute function app_private.broadcast_nudge_change();

drop trigger if exists connections_broadcast_change on public.connections;
create trigger connections_broadcast_change
after insert or update of status on public.connections
for each row execute function app_private.broadcast_connection_change();
