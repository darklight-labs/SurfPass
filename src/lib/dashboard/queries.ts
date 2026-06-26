import "server-only"

import { EnvValidationError } from "@/lib/env"
import { requireUser } from "@/lib/auth/guards"
import { scorePass } from "@/lib/passes/scoring"
import { mapPassPredictionToPassCardViewModel } from "@/lib/passes/queries"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { PassCardProps } from "@/components/data-display/pass-card"
import type { Database } from "@/types/database"
import type { PassScore } from "@/types/domain"

type GroupRow = Database["public"]["Tables"]["groups"]["Row"]
type GroupMemberRow = Database["public"]["Tables"]["group_members"]["Row"]
type GroupSubscriptionRow =
  Database["public"]["Tables"]["group_subscriptions"]["Row"]
type LocationRow = Database["public"]["Tables"]["locations"]["Row"]
type SatelliteRow = Database["public"]["Tables"]["satellites"]["Row"]
type PassPredictionRow = Database["public"]["Tables"]["pass_predictions"]["Row"]
type RsvpRow = Database["public"]["Tables"]["pass_rsvps"]["Row"]
type AlertPreferenceRow =
  Database["public"]["Tables"]["alert_preferences"]["Row"]
type NotificationDeliveryRow =
  Database["public"]["Tables"]["notification_deliveries"]["Row"]

export type DashboardGroupSummary = {
  id: string
  name: string
  subscriptionCount: number
  upcomingPassCount: number
  nextPassStartUtc?: string
}

export type DashboardMetrics = {
  locationCount: number
  groupCount: number
  subscriptionCount: number
  upcomingPassCount: number
  alertsScheduledCount: number
}

export type DashboardSummary = DashboardMetrics & {
  nextPass?: PassCardProps
  groups: DashboardGroupSummary[]
  dataWarnings: string[]
}

type PassCandidate = {
  row: PassPredictionRow
  subscription: GroupSubscriptionRow
}

type RsvpCounts = {
  going: number
  maybe: number
  skipping: number
  currentUserRsvp?: RsvpRow["status"]
  currentUserNote?: string | null
}

const emptySummary: DashboardSummary = {
  locationCount: 0,
  groupCount: 0,
  subscriptionCount: 0,
  upcomingPassCount: 0,
  alertsScheduledCount: 0,
  groups: [],
  dataWarnings: [],
}

const scoreRank: Record<PassScore, number> = {
  excellent: 0,
  good: 1,
  low: 2,
}

function shortId(id: string) {
  return id.slice(0, 8)
}

function countByGroupId<T extends { group_id: string }>(rows: T[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.group_id] = (acc[row.group_id] ?? 0) + 1
    return acc
  }, {})
}

function passScore(row: PassPredictionRow) {
  return (
    row.score ??
    scorePass({
      passType: row.pass_type,
      maxEl: row.max_el,
      durationSeconds: row.duration_seconds,
      magnitude: row.magnitude,
    })
  )
}

function comparePassCandidates(a: PassCandidate, b: PassCandidate) {
  const scoreDelta = scoreRank[passScore(a.row)] - scoreRank[passScore(b.row)]

  if (scoreDelta !== 0) {
    return scoreDelta
  }

  return (
    new Date(a.row.start_utc).getTime() - new Date(b.row.start_utc).getTime()
  )
}

function groupName(group: GroupRow | undefined, groupId: string) {
  return group?.name ?? `Group ${shortId(groupId)}`
}

async function getScopedClient(userId: string) {
  const user = await requireUser()

  if (user.id !== userId) {
    return {
      supabase: null,
      warning: "Dashboard data can only be loaded for the signed-in user.",
    }
  }

  return {
    supabase: await createServerSupabaseClient(),
    warning: null,
  }
}

export async function getDashboardSummary(
  userId: string
): Promise<DashboardSummary> {
  try {
    const scoped = await getScopedClient(userId)

    if (!scoped.supabase) {
      return {
        ...emptySummary,
        dataWarnings: scoped.warning ? [scoped.warning] : [],
      }
    }

    const supabase = scoped.supabase
    const [
      { count: locationCount, error: locationCountError },
      { data: memberships, error: membershipError },
    ] = await Promise.all([
      supabase
        .from("locations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("group_members")
        .select("group_id,user_id,role,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ])

    const warnings: string[] = []

    if (locationCountError) {
      warnings.push("Saved location count could not be loaded.")
    }

    if (membershipError) {
      return {
        ...emptySummary,
        locationCount: locationCount ?? 0,
        dataWarnings: [
          ...warnings,
          "Group memberships could not be loaded.",
        ],
      }
    }

    const membershipRows = memberships ?? []
    const groupIds = membershipRows.map((membership) => membership.group_id)

    if (groupIds.length === 0) {
      return {
        ...emptySummary,
        locationCount: locationCount ?? 0,
        dataWarnings: warnings,
      }
    }

    return buildSummaryForGroups({
      userId,
      supabase,
      locationCount: locationCount ?? 0,
      memberships: membershipRows,
      dataWarnings: warnings,
    })
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return {
        ...emptySummary,
        dataWarnings: [
          "Supabase environment variables are required to load dashboard data.",
        ],
      }
    }

    throw error
  }
}

async function buildSummaryForGroups({
  userId,
  supabase,
  locationCount,
  memberships,
  dataWarnings,
}: {
  userId: string
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
  locationCount: number
  memberships: GroupMemberRow[]
  dataWarnings: string[]
}): Promise<DashboardSummary> {
  const groupIds = memberships.map((membership) => membership.group_id)
  const [
    { data: groups, error: groupsError },
    { data: subscriptions, error: subscriptionsError },
  ] = await Promise.all([
    supabase
      .from("groups")
      .select("id,owner_id,name,description,created_at,updated_at")
      .in("id", groupIds),
    supabase
      .from("group_subscriptions")
      .select(
        "id,group_id,location_id,satellite_id,pass_type,min_elevation,min_visibility_seconds,days_ahead,alerts_enabled,created_at,updated_at"
      )
      .in("group_id", groupIds),
  ])

  const warnings = [...dataWarnings]

  if (groupsError) {
    warnings.push("Joined groups could not be loaded.")
  }

  if (subscriptionsError) {
    warnings.push("Group subscriptions could not be loaded.")
  }

  const groupRows = groups ?? []
  const subscriptionRows = subscriptions ?? []
  const passCandidates = await getPassCandidates(supabase, subscriptionRows)
  const [rsvps, alertPreferences, notificationDeliveries] = await Promise.all([
    getRsvpsForCandidates(supabase, passCandidates.candidates),
    getAlertPreferencesForGroups(supabase, userId, groupIds),
    getNotificationDeliveriesForCandidates(
      supabase,
      userId,
      passCandidates.candidates
    ),
  ])
  const rsvpCounts = mapRsvpCounts(rsvps, userId)
  const alertPreferenceMap = new Map(
    alertPreferences.map((preference) => [preference.group_id, preference])
  )
  const deliverySet = new Set(
    notificationDeliveries.map(
      (delivery) => `${delivery.group_id}:${delivery.pass_prediction_id}`
    )
  )

  warnings.push(...passCandidates.warnings)

  const satelliteMap = await getSatelliteMap(
    supabase,
    passCandidates.candidates.map((candidate) => candidate.row.satellite_id)
  )
  const locationMap = await getLocationMap(
    supabase,
    passCandidates.candidates.map((candidate) => candidate.row.location_id)
  )
  const groupMap = new Map(groupRows.map((group) => [group.id, group]))
  const subscriptionCountByGroup = countByGroupId(subscriptionRows)
  const passKeysByGroup = new Map<string, Set<string>>()
  const nextStartByGroup = new Map<string, string>()

  passCandidates.candidates.forEach(({ row, subscription }) => {
    const passKeys = passKeysByGroup.get(subscription.group_id) ?? new Set()

    passKeys.add(row.cache_key)
    passKeysByGroup.set(subscription.group_id, passKeys)

    const currentStart = nextStartByGroup.get(subscription.group_id)

    if (
      !currentStart ||
      new Date(row.start_utc).getTime() < new Date(currentStart).getTime()
    ) {
      nextStartByGroup.set(subscription.group_id, row.start_utc)
    }
  })

  const mappedPasses = passCandidates.candidates
    .sort(comparePassCandidates)
    .map(({ row, subscription }) => {
      const group = groupMap.get(subscription.group_id)
      const satellite = satelliteMap.get(row.satellite_id)
      const location = locationMap.get(row.location_id)
      const rsvpKey = `${subscription.group_id}:${row.id}`
      const alertPreference = alertPreferenceMap.get(subscription.group_id)

      return mapPassPredictionToPassCardViewModel(row, {
        groupId: subscription.group_id,
        passPredictionId: row.id,
        groupName: groupName(group, subscription.group_id),
        satelliteName: satellite?.name ?? "Satellite",
        timezone: location?.timezone,
        alertsEnabled: subscription.alerts_enabled,
        userEmailAlertsEnabled: alertPreference?.email_enabled ?? true,
        alertDeliveryExists: deliverySet.has(rsvpKey),
        minElevation: subscription.min_elevation,
        minVisibilitySeconds: subscription.min_visibility_seconds,
        rsvpCounts: rsvpCounts.get(rsvpKey),
      })
    })

  const uniqueUpcomingPassCount = new Set(
    passCandidates.candidates.map(
      ({ row, subscription }) => `${subscription.group_id}:${row.cache_key}`
    )
  ).size
  const hasStale = mappedPasses.some((pass) => pass.dataState === "stale")

  if (subscriptionRows.length > 0 && mappedPasses.length === 0) {
    warnings.push(
      "Forecast data appears after refreshing passes from a group page."
    )
  }

  if (hasStale) {
    warnings.push("Some cached pass predictions are stale.")
  }

  return {
    locationCount,
    groupCount: memberships.length,
    subscriptionCount: subscriptionRows.length,
    upcomingPassCount: uniqueUpcomingPassCount,
    alertsScheduledCount: mappedPasses.filter(
      (pass) => pass.alertState === "scheduled"
    ).length,
    nextPass: mappedPasses[0],
    groups: groupIds
      .map((groupId) => ({
        id: groupId,
        name: groupName(groupMap.get(groupId), groupId),
        subscriptionCount: subscriptionCountByGroup[groupId] ?? 0,
        upcomingPassCount: passKeysByGroup.get(groupId)?.size ?? 0,
        nextPassStartUtc: nextStartByGroup.get(groupId),
      }))
      .sort((a, b) => {
        if (a.nextPassStartUtc && b.nextPassStartUtc) {
          return (
            new Date(a.nextPassStartUtc).getTime() -
            new Date(b.nextPassStartUtc).getTime()
          )
        }

        if (a.nextPassStartUtc) {
          return -1
        }

        if (b.nextPassStartUtc) {
          return 1
        }

        return a.name.localeCompare(b.name)
      }),
    dataWarnings: [...new Set(warnings)],
  }
}

async function getPassCandidates(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  subscriptions: GroupSubscriptionRow[]
) {
  const now = new Date().toISOString()
  const results = await Promise.all(
    subscriptions.map(async (subscription) => {
      const { data, error } = await supabase
        .from("pass_predictions")
        .select(
          "id,satellite_id,location_id,pass_type,source,start_utc,max_utc,end_utc,start_az,start_az_compass,start_el,max_az,max_az_compass,max_el,end_az,end_az_compass,end_el,magnitude,duration_seconds,score,daylight_label,daylight_context,daylight_fetched_at,raw,fetched_at,cache_key,created_at"
        )
        .eq("satellite_id", subscription.satellite_id)
        .eq("location_id", subscription.location_id)
        .eq("pass_type", subscription.pass_type)
        .gte("end_utc", now)
        .order("start_utc", { ascending: true })
        .limit(12)

      return {
        subscription,
        rows: data ?? [],
        error,
      }
    })
  )

  return {
    candidates: results.flatMap((result) =>
      result.rows.map((row) => ({
        row,
        subscription: result.subscription,
      }))
    ),
    warnings: results.some((result) => result.error)
      ? ["Some pass predictions could not be loaded."]
      : [],
  }
}

async function getRsvpsForCandidates(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  candidates: PassCandidate[]
) {
  const groupIds = [
    ...new Set(candidates.map((candidate) => candidate.subscription.group_id)),
  ]
  const passIds = [...new Set(candidates.map((candidate) => candidate.row.id))]

  if (groupIds.length === 0 || passIds.length === 0) {
    return []
  }

  const { data } = await supabase
    .from("pass_rsvps")
    .select(
      "id,group_id,pass_prediction_id,user_id,status,note,created_at,updated_at"
    )
    .in("group_id", groupIds)
    .in("pass_prediction_id", passIds)

  return data ?? []
}

async function getAlertPreferencesForGroups(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  groupIds: string[]
) {
  const ids = [...new Set(groupIds)]

  if (ids.length === 0) {
    return [] as AlertPreferenceRow[]
  }

  const { data } = await supabase
    .from("alert_preferences")
    .select("id,user_id,group_id,email_enabled,lead_minutes,created_at,updated_at")
    .eq("user_id", userId)
    .in("group_id", ids)

  return data ?? []
}

async function getNotificationDeliveriesForCandidates(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  candidates: PassCandidate[]
) {
  const groupIds = [
    ...new Set(candidates.map((candidate) => candidate.subscription.group_id)),
  ]
  const passIds = [...new Set(candidates.map((candidate) => candidate.row.id))]

  if (groupIds.length === 0 || passIds.length === 0) {
    return [] as NotificationDeliveryRow[]
  }

  const { data } = await supabase
    .from("notification_deliveries")
    .select(
      "id,user_id,group_id,pass_prediction_id,channel,lead_minutes,status,sent_at,provider_message_id,metadata"
    )
    .eq("user_id", userId)
    .eq("channel", "email")
    .eq("status", "sent")
    .in("group_id", groupIds)
    .in("pass_prediction_id", passIds)

  return data ?? []
}

function emptyRsvpCounts(): RsvpCounts {
  return {
    going: 0,
    maybe: 0,
    skipping: 0,
  }
}

function mapRsvpCounts(rows: RsvpRow[], currentUserId: string) {
  const counts = new Map<string, RsvpCounts>()

  rows.forEach((row) => {
    const key = `${row.group_id}:${row.pass_prediction_id}`
    const current = counts.get(key) ?? emptyRsvpCounts()

    if (row.status === "going") {
      current.going += 1
    }

    if (row.status === "maybe") {
      current.maybe += 1
    }

    if (row.status === "skipping") {
      current.skipping += 1
    }

    if (row.user_id === currentUserId) {
      current.currentUserRsvp = row.status
      current.currentUserNote = row.note
    }

    counts.set(key, current)
  })

  return counts
}

async function getSatelliteMap(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  satelliteIds: string[]
) {
  const ids = [...new Set(satelliteIds)]

  if (ids.length === 0) {
    return new Map<string, SatelliteRow>()
  }

  const { data } = await supabase
    .from("satellites")
    .select("id,norad_id,name,category,description,is_curated,created_at,updated_at")
    .in("id", ids)

  return new Map((data ?? []).map((satellite) => [satellite.id, satellite]))
}

async function getLocationMap(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  locationIds: string[]
) {
  const ids = [...new Set(locationIds)]

  if (ids.length === 0) {
    return new Map<string, LocationRow>()
  }

  const { data } = await supabase
    .from("locations")
    .select(
      "id,user_id,name,label,latitude,longitude,elevation_m,timezone,country,is_default,created_at,updated_at"
    )
    .in("id", ids)

  return new Map((data ?? []).map((location) => [location.id, location]))
}

export async function getNextGoodPassForUser(userId: string) {
  return (await getDashboardSummary(userId)).nextPass
}

export async function getUserGroupReadiness(userId: string) {
  return (await getDashboardSummary(userId)).groups
}

export async function getDashboardMetrics(
  userId: string
): Promise<DashboardMetrics> {
  const summary = await getDashboardSummary(userId)

  return {
    locationCount: summary.locationCount,
    groupCount: summary.groupCount,
    subscriptionCount: summary.subscriptionCount,
    upcomingPassCount: summary.upcomingPassCount,
    alertsScheduledCount: summary.alertsScheduledCount,
  }
}
