-- Re-apply the group coordination RLS repair that was patched manually in
-- hosted Supabase. This migration is safe to run on existing projects because
-- helper functions are replaced and group-related policies are dropped before
-- being recreated.

create or replace function public.is_group_member(
  target_group_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = target_user_id
  );
$$;

create or replace function public.is_group_owner(
  target_group_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = target_group_id
      and g.owner_id = target_user_id
  )
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = target_user_id
      and gm.role = 'owner'
  );
$$;

create or replace function public.location_belongs_to_group_member(
  target_location_id uuid,
  target_group_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.locations l
    join public.group_members gm on gm.user_id = l.user_id
    where l.id = target_location_id
      and gm.group_id = target_group_id
  );
$$;

revoke all on function public.is_group_member(uuid, uuid) from public;
revoke all on function public.is_group_owner(uuid, uuid) from public;
revoke all on function public.location_belongs_to_group_member(uuid, uuid) from public;

grant execute on function public.is_group_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_group_owner(uuid, uuid) to authenticated, service_role;
grant execute on function public.location_belongs_to_group_member(uuid, uuid) to authenticated, service_role;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_subscriptions enable row level security;

grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.group_subscriptions to authenticated;

drop policy if exists "groups_select_members" on public.groups;
drop policy if exists "groups_insert_owner" on public.groups;
drop policy if exists "groups_update_owner" on public.groups;
drop policy if exists "groups_delete_owner" on public.groups;

create policy "groups_select_members"
  on public.groups for select
  to authenticated
  using (public.is_group_member(id));

create policy "groups_insert_owner"
  on public.groups for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "groups_update_owner"
  on public.groups for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "groups_delete_owner"
  on public.groups for delete
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "group_members_select_roster" on public.group_members;
drop policy if exists "group_members_insert_owner" on public.group_members;
drop policy if exists "group_members_update_owner" on public.group_members;
drop policy if exists "group_members_delete_owner" on public.group_members;

create policy "group_members_select_roster"
  on public.group_members for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "group_members_insert_owner"
  on public.group_members for insert
  to authenticated
  with check (public.is_group_owner(group_id));

create policy "group_members_update_owner"
  on public.group_members for update
  to authenticated
  using (public.is_group_owner(group_id))
  with check (public.is_group_owner(group_id));

create policy "group_members_delete_owner"
  on public.group_members for delete
  to authenticated
  using (public.is_group_owner(group_id));

drop policy if exists "group_subscriptions_select_members" on public.group_subscriptions;
drop policy if exists "group_subscriptions_insert_owner" on public.group_subscriptions;
drop policy if exists "group_subscriptions_update_owner" on public.group_subscriptions;
drop policy if exists "group_subscriptions_delete_owner" on public.group_subscriptions;

create policy "group_subscriptions_select_members"
  on public.group_subscriptions for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "group_subscriptions_insert_owner"
  on public.group_subscriptions for insert
  to authenticated
  with check (
    public.is_group_owner(group_id)
    and public.location_belongs_to_group_member(location_id, group_id)
  );

create policy "group_subscriptions_update_owner"
  on public.group_subscriptions for update
  to authenticated
  using (public.is_group_owner(group_id))
  with check (
    public.is_group_owner(group_id)
    and public.location_belongs_to_group_member(location_id, group_id)
  );

create policy "group_subscriptions_delete_owner"
  on public.group_subscriptions for delete
  to authenticated
  using (public.is_group_owner(group_id));
