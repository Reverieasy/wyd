drop policy if exists "Clients cannot access notification deliveries" on public.notification_deliveries;
create policy "Clients cannot access notification deliveries"
on public.notification_deliveries
for all
to authenticated
using (false)
with check (false);

create or replace function app_private.register_push_token_impl(
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

create or replace function app_private.disable_push_token_impl(p_expo_push_token text)
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
language sql
security invoker
set search_path = ''
as $$
  select * from app_private.register_push_token_impl(
    p_expo_push_token,
    p_platform,
    p_device_identifier
  );
$$;

create or replace function public.disable_push_token(p_expo_push_token text)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select app_private.disable_push_token_impl(p_expo_push_token);
$$;

revoke all on function app_private.register_push_token_impl(text, text, text) from public, anon;
grant execute on function app_private.register_push_token_impl(text, text, text) to authenticated;
revoke all on function app_private.disable_push_token_impl(text) from public, anon;
grant execute on function app_private.disable_push_token_impl(text) to authenticated;

revoke all on function public.register_push_token(text, text, text) from public, anon;
grant execute on function public.register_push_token(text, text, text) to authenticated;
revoke all on function public.disable_push_token(text) from public, anon;
grant execute on function public.disable_push_token(text) to authenticated;
