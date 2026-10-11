drop policy if exists "Recipients can view shared updates" on public.updates;
drop policy if exists "Users can view their own updates" on public.updates;

create policy "Users can view authorized updates"
on public.updates for select to authenticated
using ((select app_private.can_view_update(id)));
