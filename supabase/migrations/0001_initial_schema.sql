create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  label text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  elevation_m double precision not null default 0,
  timezone text,
  country text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.satellites (
  id uuid primary key default gen_random_uuid(),
  norad_id integer not null unique,
  name text not null,
  category text,
  description text,
  is_curated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.group_subscriptions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  satellite_id uuid not null references public.satellites(id) on delete cascade,
  pass_type text not null check (pass_type in ('radio', 'visual')),
  min_elevation integer not null default 30 check (min_elevation between 0 and 90),
  min_visibility_seconds integer not null default 120 check (min_visibility_seconds >= 0),
  days_ahead integer not null default 7 check (days_ahead between 1 and 14),
  alerts_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, location_id, satellite_id, pass_type)
);

create table public.pass_predictions (
  id uuid primary key default gen_random_uuid(),
  satellite_id uuid not null references public.satellites(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  pass_type text not null check (pass_type in ('radio', 'visual')),
  source text not null default 'n2yo',
  start_utc timestamptz not null,
  max_utc timestamptz not null,
  end_utc timestamptz not null,
  start_az double precision,
  start_az_compass text,
  start_el double precision,
  max_az double precision,
  max_az_compass text,
  max_el double precision,
  end_az double precision,
  end_az_compass text,
  end_el double precision,
  magnitude double precision,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  score text check (score is null or score in ('excellent', 'good', 'low')),
  raw jsonb,
  fetched_at timestamptz not null default now(),
  cache_key text not null unique,
  created_at timestamptz not null default now(),
  check (start_utc <= max_utc and max_utc <= end_utc)
);

create table public.pass_rsvps (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  pass_prediction_id uuid not null references public.pass_predictions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('going', 'maybe', 'skipping')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, pass_prediction_id, user_id)
);

create table public.alert_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  email_enabled boolean not null default true,
  lead_minutes integer not null default 30 check (lead_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, group_id)
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  pass_prediction_id uuid not null references public.pass_predictions(id) on delete cascade,
  channel text not null default 'email',
  lead_minutes integer not null check (lead_minutes > 0),
  status text not null default 'sent' check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  provider_message_id text,
  metadata jsonb,
  unique (user_id, group_id, pass_prediction_id, channel, lead_minutes)
);

create table public.api_fetch_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  endpoint text not null,
  status text not null,
  status_code integer,
  message text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index locations_user_id_idx on public.locations(user_id);
create unique index locations_one_default_per_user_idx on public.locations(user_id) where is_default;
create index group_members_user_id_idx on public.group_members(user_id);
create index group_members_group_id_idx on public.group_members(group_id);
create index group_subscriptions_group_id_idx on public.group_subscriptions(group_id);
create index group_subscriptions_lookup_idx on public.group_subscriptions(satellite_id, location_id, pass_type);
create index pass_predictions_lookup_idx on public.pass_predictions(satellite_id, location_id, pass_type, start_utc);
create index pass_predictions_start_utc_idx on public.pass_predictions(start_utc);
create index notification_deliveries_lookup_idx on public.notification_deliveries(user_id, group_id, pass_prediction_id);
create index api_fetch_logs_created_at_idx on public.api_fetch_logs(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger locations_set_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

create trigger satellites_set_updated_at
  before update on public.satellites
  for each row execute function public.set_updated_at();

create trigger groups_set_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at();

create trigger group_subscriptions_set_updated_at
  before update on public.group_subscriptions
  for each row execute function public.set_updated_at();

create trigger pass_rsvps_set_updated_at
  before update on public.pass_rsvps
  for each row execute function public.set_updated_at();

create trigger alert_preferences_set_updated_at
  before update on public.alert_preferences
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(profiles.full_name, excluded.full_name);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.create_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (group_id, user_id) do update
    set role = 'owner';

  return new;
end;
$$;

create trigger groups_create_owner_membership
  after insert on public.groups
  for each row execute function public.create_owner_membership();

create or replace function public.is_group_member(target_group_id uuid, target_user_id uuid default auth.uid())
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

create or replace function public.is_group_owner(target_group_id uuid, target_user_id uuid default auth.uid())
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

create or replace function public.location_belongs_to_group_member(target_location_id uuid, target_group_id uuid)
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

create or replace function public.is_prediction_in_group(target_group_id uuid, target_pass_prediction_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pass_predictions pp
    join public.group_subscriptions gs
      on gs.satellite_id = pp.satellite_id
     and gs.location_id = pp.location_id
     and gs.pass_type = pp.pass_type
    where pp.id = target_pass_prediction_id
      and gs.group_id = target_group_id
  );
$$;

revoke all on function public.is_group_member(uuid, uuid) from public;
revoke all on function public.is_group_owner(uuid, uuid) from public;
revoke all on function public.location_belongs_to_group_member(uuid, uuid) from public;
revoke all on function public.is_prediction_in_group(uuid, uuid) from public;

grant execute on function public.is_group_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_group_owner(uuid, uuid) to authenticated, service_role;
grant execute on function public.location_belongs_to_group_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_prediction_in_group(uuid, uuid) to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.satellites enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_subscriptions enable row level security;
alter table public.pass_predictions enable row level security;
alter table public.pass_rsvps enable row level security;
alter table public.alert_preferences enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.api_fetch_logs enable row level security;

grant usage on schema public to authenticated, service_role;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.locations to authenticated;
grant select on public.satellites to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.group_subscriptions to authenticated;
grant select on public.pass_predictions to authenticated;
grant select, insert, update, delete on public.pass_rsvps to authenticated;
grant select, insert, update, delete on public.alert_preferences to authenticated;
grant select on public.notification_deliveries to authenticated;
grant all on all tables in schema public to service_role;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "locations_select_own"
  on public.locations for select
  to authenticated
  using (user_id = auth.uid());

create policy "locations_insert_own"
  on public.locations for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "locations_update_own"
  on public.locations for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "locations_delete_own"
  on public.locations for delete
  to authenticated
  using (user_id = auth.uid());

create policy "satellites_select_authenticated"
  on public.satellites for select
  to authenticated
  using (true);

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

create policy "pass_predictions_select_group_members"
  on public.pass_predictions for select
  to authenticated
  using (
    exists (
      select 1
      from public.group_subscriptions gs
      where gs.satellite_id = pass_predictions.satellite_id
        and gs.location_id = pass_predictions.location_id
        and gs.pass_type = pass_predictions.pass_type
        and public.is_group_member(gs.group_id)
    )
  );

create policy "pass_rsvps_select_members"
  on public.pass_rsvps for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "pass_rsvps_insert_own"
  on public.pass_rsvps for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_group_member(group_id)
    and public.is_prediction_in_group(group_id, pass_prediction_id)
  );

create policy "pass_rsvps_update_own"
  on public.pass_rsvps for update
  to authenticated
  using (user_id = auth.uid() and public.is_group_member(group_id))
  with check (
    user_id = auth.uid()
    and public.is_group_member(group_id)
    and public.is_prediction_in_group(group_id, pass_prediction_id)
  );

create policy "pass_rsvps_delete_own"
  on public.pass_rsvps for delete
  to authenticated
  using (user_id = auth.uid() and public.is_group_member(group_id));

create policy "alert_preferences_select_own"
  on public.alert_preferences for select
  to authenticated
  using (user_id = auth.uid());

create policy "alert_preferences_insert_own"
  on public.alert_preferences for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_group_member(group_id));

create policy "alert_preferences_update_own"
  on public.alert_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_group_member(group_id));

create policy "alert_preferences_delete_own"
  on public.alert_preferences for delete
  to authenticated
  using (user_id = auth.uid());

create policy "notification_deliveries_select_own"
  on public.notification_deliveries for select
  to authenticated
  using (user_id = auth.uid());

-- api_fetch_logs intentionally has no authenticated policies. Server-side
-- service-role code writes provider diagnostics and bypasses RLS.
