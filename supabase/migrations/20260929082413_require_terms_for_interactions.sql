create or replace function app_private.has_current_terms(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.terms_acceptances ta
    where ta.user_id = p_user_id
      and ta.version = app_private.current_terms_version()
  );
$$;

revoke all on function app_private.has_current_terms(uuid) from public, anon;
grant execute on function app_private.has_current_terms(uuid) to authenticated, service_role;

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
      and n.created_at > pg_catalog.now() - interval '15 minutes'
  ) then raise exception using errcode='P0001', message='nudge_cooldown'; end if;

  return query insert into public.nudges (sender_id, receiver_id)
  values (v_uid, p_recipient_id)
  returning nudges.id, nudges.sender_id, nudges.receiver_id, nudges.status, nudges.created_at,
            nudges.responded_at, nudges.response_update_id, nudges.seen_at;
end;
$$;

create or replace function app_private.set_reaction_impl(p_update_id uuid, p_reaction text)
returns table(id uuid, update_id uuid, user_id uuid, reaction text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception using errcode='P0001', message='AUTH_REQUIRED'; end if;
  if not app_private.has_current_terms(v_uid) then raise exception using errcode='P0001', message='terms_required'; end if;
  if p_reaction not in ('heart', 'teary', 'laugh', 'fire', 'eyes') then
    raise exception using errcode='P0001', message='reaction_invalid';
  end if;
  if not app_private.can_view_update(p_update_id) then
    raise exception using errcode='P0001', message='reaction_update_not_visible';
  end if;
  return query insert into public.reactions as r (update_id, user_id, reaction)
  values (p_update_id, v_uid, p_reaction)
  on conflict on constraint reactions_update_id_user_id_key
  do update set reaction = excluded.reaction, created_at = pg_catalog.now()
  returning r.id, r.update_id, r.user_id, r.reaction, r.created_at;
end;
$$;
