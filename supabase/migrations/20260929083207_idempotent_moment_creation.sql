alter table public.updates add column if not exists client_request_id uuid;

create unique index if not exists updates_sender_client_request_uidx
on public.updates(sender_id, client_request_id)
where client_request_id is not null;

create or replace function app_private.create_update_v2_impl(
  p_photo_path text,
  p_recipient_ids uuid[],
  p_client_request_id uuid,
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
  if p_client_request_id is null then raise exception using errcode = 'P0001', message = 'request_id_required'; end if;

  return query
  select u.id, u.sender_id, u.photo_path, u.caption, u.status_text, u.is_quiet, u.created_at, u.expires_at
  from public.updates u
  where u.sender_id = v_uid and u.client_request_id = p_client_request_id;
  if found then return; end if;

  if not app_private.has_current_terms(v_uid) then raise exception using errcode = 'P0001', message = 'terms_required'; end if;
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

  insert into public.updates(sender_id, photo_path, caption, status_text, is_quiet, client_request_id)
  values (v_uid, p_photo_path, nullif(btrim(p_caption), ''), nullif(btrim(p_status_text), ''), coalesce(p_is_quiet, false), p_client_request_id)
  returning updates.id, updates.created_at, updates.expires_at into v_update_id, v_created_at, v_expires_at;
  insert into public.update_recipients(update_id, recipient_id)
  select v_update_id, recipient_id from unnest(v_recipients) recipient_id;
  return query select v_update_id, v_uid, p_photo_path, nullif(btrim(p_caption), '')::varchar,
    nullif(btrim(p_status_text), ''), coalesce(p_is_quiet, false), v_created_at, v_expires_at;
end;
$$;

create or replace function public.create_update_v2(
  p_photo_path text,
  p_recipient_ids uuid[],
  p_client_request_id uuid,
  p_caption text default null,
  p_status_text text default null,
  p_is_quiet boolean default false
)
returns table(id uuid, sender_id uuid, photo_path text, caption varchar, status_text text, is_quiet boolean, created_at timestamptz, expires_at timestamptz)
language sql
set search_path = ''
as $$
  select * from app_private.create_update_v2_impl(
    p_photo_path, p_recipient_ids, p_client_request_id, p_caption, p_status_text, p_is_quiet
  );
$$;

revoke all on function app_private.create_update_v2_impl(text, uuid[], uuid, text, text, boolean) from public, anon;
revoke all on function public.create_update_v2(text, uuid[], uuid, text, text, boolean) from public, anon;
grant execute on function app_private.create_update_v2_impl(text, uuid[], uuid, text, text, boolean) to authenticated, service_role;
grant execute on function public.create_update_v2(text, uuid[], uuid, text, text, boolean) to authenticated, service_role;
