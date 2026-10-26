-- Enforce the same rule for RPC callers and direct Data API inserts.
create or replace function app_private.set_reaction_impl(p_update_id uuid, p_reaction text)
returns table(id uuid, update_id uuid, user_id uuid, reaction text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
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
  if exists(select 1 from public.updates u where u.id=p_update_id and u.sender_id=v_uid) then
    raise exception using errcode='P0001', message='reaction_own_update';
  end if;
  return query insert into public.reactions as r (update_id, user_id, reaction)
  values (p_update_id, v_uid, p_reaction)
  on conflict on constraint reactions_update_id_user_id_key
  do update set reaction = excluded.reaction, created_at = pg_catalog.now()
  returning r.id, r.update_id, r.user_id, r.reaction, r.created_at;
end;
$function$;

alter policy "Users can react as themselves" on public.reactions
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.updates u
    where u.id = reactions.update_id and u.sender_id <> (select auth.uid())
  )
  and app_private.can_view_update(update_id)
);
