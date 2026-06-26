import "server-only"

import { EnvValidationError } from "@/lib/env"
import { requireUser } from "@/lib/auth/guards"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type {
  GroupDetailViewModel,
  GroupMemberViewModel,
  GroupRole,
  GroupSubscriptionViewModel,
  GroupSummaryViewModel,
  SatelliteCatalogueItem,
  SavedLocationViewModel,
} from "@/types/domain"
import type {
  GroupDetailResult,
  GroupSubscriptionOptions,
  GroupsResult,
} from "@/lib/groups/types"

type GroupRow = Database["public"]["Tables"]["groups"]["Row"]
type GroupMemberRow = Database["public"]["Tables"]["group_members"]["Row"]
type GroupSubscriptionRow =
  Database["public"]["Tables"]["group_subscriptions"]["Row"]
type LocationRow = Database["public"]["Tables"]["locations"]["Row"]
type SatelliteRow = Database["public"]["Tables"]["satellites"]["Row"]

function shortId(id: string) {
  return id.slice(0, 8)
}

function mapLocation(row: LocationRow): SavedLocationViewModel {
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    elevationM: row.elevation_m,
    timezone: row.timezone,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapSatellite(row: SatelliteRow): SatelliteCatalogueItem {
  return {
    id: row.id,
    noradId: row.norad_id,
    name: row.name,
    category: row.category,
    description: row.description,
    isCurated: row.is_curated,
  }
}

function countByGroupId<T extends { group_id: string }>(rows: T[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.group_id] = (acc[row.group_id] ?? 0) + 1
    return acc
  }, {})
}

function mapGroupSummary(
  group: GroupRow,
  membership: GroupMemberRow,
  memberCount: number,
  subscriptionCount: number
): GroupSummaryViewModel {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    ownerId: group.owner_id,
    currentUserRole: membership.role,
    memberCount,
    subscriptionCount,
    createdAt: group.created_at,
  }
}

function mapGroupDetail(
  group: GroupRow,
  currentUserRole: GroupRole,
  memberCount: number,
  subscriptionCount: number
): GroupDetailViewModel {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    ownerId: group.owner_id,
    currentUserRole,
    createdAt: group.created_at,
    memberCount,
    subscriptionCount,
  }
}

function mapMember(
  member: GroupMemberRow,
  currentUserId: string,
  currentUserEmail?: string | null
): GroupMemberViewModel {
  const isCurrentUser = member.user_id === currentUserId

  return {
    userId: member.user_id,
    displayName: isCurrentUser
      ? currentUserEmail ?? "You"
      : `Member ${shortId(member.user_id)}`,
    role: member.role,
    isCurrentUser,
    joinedAt: member.created_at,
  }
}

function mapSubscription(
  subscription: GroupSubscriptionRow,
  locations: Map<string, SavedLocationViewModel>,
  satellites: Map<string, SatelliteCatalogueItem>
): GroupSubscriptionViewModel {
  const location = locations.get(subscription.location_id)
  const satellite = satellites.get(subscription.satellite_id)

  return {
    id: subscription.id,
    groupId: subscription.group_id,
    locationId: subscription.location_id,
    locationName:
      location?.label ??
      location?.name ??
      `Location ${shortId(subscription.location_id)}`,
    satelliteId: subscription.satellite_id,
    satelliteName:
      satellite?.name ?? `Satellite ${shortId(subscription.satellite_id)}`,
    noradId: satellite?.noradId ?? 0,
    passType: subscription.pass_type,
    minElevation: subscription.min_elevation,
    minVisibilitySeconds: subscription.min_visibility_seconds,
    daysAhead: subscription.days_ahead,
    alertsEnabled: subscription.alerts_enabled,
    createdAt: subscription.created_at,
  }
}

export async function getUserGroups(): Promise<GroupsResult> {
  try {
    const user = await requireUser()
    const supabase = await createServerSupabaseClient()
    const { data: memberships, error: membershipError } = await supabase
      .from("group_members")
      .select("group_id,user_id,role,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (membershipError) {
      return { groups: [], error: membershipError.message }
    }

    const groupIds = (memberships ?? []).map((membership) => membership.group_id)

    if (groupIds.length === 0) {
      return { groups: [] }
    }

    const [{ data: groups, error: groupsError }, { data: allMembers }, { data: subscriptions }] =
      await Promise.all([
        supabase
          .from("groups")
          .select("id,owner_id,name,description,created_at,updated_at")
          .in("id", groupIds),
        supabase
          .from("group_members")
          .select("group_id,user_id,role,created_at")
          .in("group_id", groupIds),
        supabase
          .from("group_subscriptions")
          .select(
            "id,group_id,location_id,satellite_id,pass_type,min_elevation,min_visibility_seconds,days_ahead,alerts_enabled,created_at,updated_at"
          )
          .in("group_id", groupIds),
      ])

    if (groupsError) {
      return { groups: [], error: groupsError.message }
    }

    const memberCount = countByGroupId(allMembers ?? [])
    const subscriptionCount = countByGroupId(subscriptions ?? [])
    const membershipByGroup = new Map(
      (memberships ?? []).map((membership) => [membership.group_id, membership])
    )

    return {
      groups: (groups ?? [])
        .map((group) => {
          const membership = membershipByGroup.get(group.id)

          if (!membership) {
            return null
          }

          return mapGroupSummary(
            group,
            membership,
            memberCount[group.id] ?? 0,
            subscriptionCount[group.id] ?? 0
          )
        })
        .filter((group): group is GroupSummaryViewModel => group !== null)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return {
        groups: [],
        error: "Supabase environment variables are required to load groups.",
      }
    }

    throw error
  }
}

export async function getUserGroupCount(): Promise<number | null> {
  try {
    const user = await requireUser()
    const supabase = await createServerSupabaseClient()
    const { count, error } = await supabase
      .from("group_members")
      .select("group_id", { count: "exact", head: true })
      .eq("user_id", user.id)

    if (error) {
      return null
    }

    return count ?? 0
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return null
    }

    throw error
  }
}

export async function getGroupDetail(groupId: string): Promise<GroupDetailResult> {
  try {
    const user = await requireUser()
    const supabase = await createServerSupabaseClient()
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("id,owner_id,name,description,created_at,updated_at")
      .eq("id", groupId)
      .maybeSingle()

    if (groupError) {
      return {
        group: null,
        members: [],
        subscriptions: [],
        error: groupError.message,
      }
    }

    if (!group) {
      return {
        group: null,
        members: [],
        subscriptions: [],
      }
    }

    const [
      { data: members, error: membersError },
      { data: subscriptions, error: subscriptionsError },
    ] = await Promise.all([
      supabase
        .from("group_members")
        .select("group_id,user_id,role,created_at")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true }),
      supabase
        .from("group_subscriptions")
        .select(
          "id,group_id,location_id,satellite_id,pass_type,min_elevation,min_visibility_seconds,days_ahead,alerts_enabled,created_at,updated_at"
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: false }),
    ])

    if (membersError) {
      return { group: null, members: [], subscriptions: [], error: membersError.message }
    }

    if (subscriptionsError) {
      return {
        group: null,
        members: [],
        subscriptions: [],
        error: subscriptionsError.message,
      }
    }

    const subscriptionRows = subscriptions ?? []
    const locationIds = [...new Set(subscriptionRows.map((row) => row.location_id))]
    const satelliteIds = [...new Set(subscriptionRows.map((row) => row.satellite_id))]

    const [{ data: locationRows }, { data: satelliteRows }] = await Promise.all([
      locationIds.length > 0
        ? supabase
            .from("locations")
            .select(
              "id,user_id,name,label,latitude,longitude,elevation_m,timezone,country,is_default,created_at,updated_at"
            )
            .in("id", locationIds)
        : Promise.resolve({ data: [] as LocationRow[] }),
      satelliteIds.length > 0
        ? supabase
            .from("satellites")
            .select(
              "id,norad_id,name,category,description,is_curated,created_at,updated_at"
            )
            .in("id", satelliteIds)
        : Promise.resolve({ data: [] as SatelliteRow[] }),
    ])

    const locationMap = new Map(
      (locationRows ?? []).map((row) => [row.id, mapLocation(row)])
    )
    const satelliteMap = new Map(
      (satelliteRows ?? []).map((row) => [row.id, mapSatellite(row)])
    )
    const currentMembership = (members ?? []).find(
      (member) => member.user_id === user.id
    )

    return {
      group: mapGroupDetail(
        group,
        currentMembership?.role ?? "member",
        members?.length ?? 0,
        subscriptionRows.length
      ),
      members: (members ?? []).map((member) =>
        mapMember(member, user.id, user.email)
      ),
      subscriptions: subscriptionRows.map((subscription) =>
        mapSubscription(subscription, locationMap, satelliteMap)
      ),
    }
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return {
        group: null,
        members: [],
        subscriptions: [],
        error:
          "Supabase environment variables are required to load group details.",
      }
    }

    throw error
  }
}

export async function getGroupSubscriptionOptions(): Promise<GroupSubscriptionOptions> {
  try {
    await requireUser()

    const supabase = await createServerSupabaseClient()
    const [
      { data: locations, error: locationsError },
      { data: satellites, error: satellitesError },
    ] = await Promise.all([
      supabase
        .from("locations")
        .select(
          "id,user_id,name,label,latitude,longitude,elevation_m,timezone,country,is_default,created_at,updated_at"
        )
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("satellites")
        .select("id,norad_id,name,category,description,is_curated,created_at,updated_at")
        .order("is_curated", { ascending: false })
        .order("name", { ascending: true }),
    ])

    if (locationsError || satellitesError) {
      return {
        locations: [],
        satellites: [],
        error:
          locationsError?.message ??
          satellitesError?.message ??
          "Subscription options are unavailable.",
      }
    }

    return {
      locations: (locations ?? []).map(mapLocation),
      satellites: (satellites ?? []).map(mapSatellite),
    }
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return {
        locations: [],
        satellites: [],
        error:
          "Supabase environment variables are required to load subscription options.",
      }
    }

    throw error
  }
}
