import "server-only"

import { derivePassAlertState } from "@/lib/alerts/state"
import { EnvValidationError } from "@/lib/env"
import { requireUser } from "@/lib/auth/guards"
import { isCacheFresh } from "@/lib/passes/cache"
import { scorePass } from "@/lib/passes/scoring"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { formatLocalPassTime } from "@/lib/utils/dates"
import type { PassCardProps } from "@/components/data-display/pass-card"
import type { Database } from "@/types/database"
import type { DataState, RsvpStatus } from "@/types/domain"

type PassPredictionRow = Database["public"]["Tables"]["pass_predictions"]["Row"]
type GroupSubscriptionRow =
  Database["public"]["Tables"]["group_subscriptions"]["Row"]
type SatelliteRow = Database["public"]["Tables"]["satellites"]["Row"]
type LocationRow = Database["public"]["Tables"]["locations"]["Row"]
type RsvpRow = Database["public"]["Tables"]["pass_rsvps"]["Row"]
type AlertPreferenceRow =
  Database["public"]["Tables"]["alert_preferences"]["Row"]
type NotificationDeliveryRow =
  Database["public"]["Tables"]["notification_deliveries"]["Row"]

type RsvpCounts = {
  going: number
  maybe: number
  skipping: number
  currentUserRsvp?: RsvpStatus | null
  currentUserNote?: string | null
}

export type GroupPassFeedResult = {
  passes: PassCardProps[]
  hasStale: boolean
  warnings: string[]
  error?: string
}

function subscriptionKey({
  satellite_id,
  location_id,
  pass_type,
}: Pick<GroupSubscriptionRow, "satellite_id" | "location_id" | "pass_type">) {
  return `${satellite_id}:${location_id}:${pass_type}`
}

function predictionKey({
  satellite_id,
  location_id,
  pass_type,
}: Pick<PassPredictionRow, "satellite_id" | "location_id" | "pass_type">) {
  return `${satellite_id}:${location_id}:${pass_type}`
}

function getDataState(fetchedAt: string): DataState {
  const fetched = new Date(fetchedAt)
  const ageMs = Date.now() - fetched.getTime()

  if (!Number.isFinite(ageMs)) {
    return "unavailable"
  }

  if (ageMs >= 0 && ageMs <= 15 * 60 * 1000) {
    return "live"
  }

  return isCacheFresh(fetched) ? "cached" : "stale"
}

function directionSummary(row: PassPredictionRow) {
  return [row.start_az_compass, row.max_az_compass, row.end_az_compass]
    .filter(Boolean)
    .join(" -> ")
}

function fallbackDurationSeconds(row: PassPredictionRow) {
  if (row.duration_seconds !== null) {
    return row.duration_seconds
  }

  const start = new Date(row.start_utc).getTime()
  const end = new Date(row.end_utc).getTime()
  const duration = Math.round((end - start) / 1000)

  return Number.isFinite(duration) && duration > 0 ? duration : 0
}

export function mapPassPredictionToPassCardViewModel(
  row: PassPredictionRow,
  context: {
    groupId?: string
    passPredictionId?: string
    groupName: string
    satelliteName: string
    timezone?: string | null
    alertsEnabled?: boolean
    userEmailAlertsEnabled?: boolean
    alertDeliveryExists?: boolean
    minElevation?: number | null
    minVisibilitySeconds?: number | null
    rsvpCounts?: RsvpCounts
  }
): PassCardProps {
  const durationSeconds = fallbackDurationSeconds(row)
  const score =
    row.score ??
    scorePass({
      passType: row.pass_type,
      maxEl: row.max_el,
      durationSeconds,
      magnitude: row.magnitude,
    })

  return {
    groupId: context.groupId,
    passPredictionId: context.passPredictionId,
    satelliteName: context.satelliteName,
    passType: row.pass_type,
    groupName: context.groupName,
    localStart: formatLocalPassTime(row.start_utc, context.timezone),
    localMax: formatLocalPassTime(row.max_utc, context.timezone),
    localEnd: formatLocalPassTime(row.end_utc, context.timezone),
    maxElevation: row.max_el ?? 0,
    startAzCompass: row.start_az_compass,
    maxAzCompass: row.max_az_compass,
    endAzCompass: row.end_az_compass,
    directionSummary: directionSummary(row) || "Direction unavailable",
    durationSeconds,
    magnitude: row.magnitude,
    score,
    daylightLabel: row.daylight_label,
    rsvpGoingCount: context.rsvpCounts?.going ?? 0,
    rsvpMaybeCount: context.rsvpCounts?.maybe ?? 0,
    rsvpSkippingCount: context.rsvpCounts?.skipping ?? 0,
    currentUserRsvp: context.rsvpCounts?.currentUserRsvp ?? null,
    currentUserNote: context.rsvpCounts?.currentUserNote,
    rsvpSummary: `${context.rsvpCounts?.going ?? 0} going / ${
      context.rsvpCounts?.maybe ?? 0
    } maybe`,
    alertState: derivePassAlertState({
      passType: row.pass_type,
      startUtc: row.start_utc,
      maxElevation: row.max_el,
      durationSeconds,
      minElevation: context.minElevation,
      minVisibilitySeconds: context.minVisibilitySeconds,
      subscriptionAlertsEnabled: context.alertsEnabled,
      userEmailEnabled: context.userEmailAlertsEnabled,
      deliveryExists: context.alertDeliveryExists,
    }),
    dataState: getDataState(row.fetched_at),
    fetchedAt: new Date(row.fetched_at),
  }
}

function emptyRsvpCounts(): RsvpCounts {
  return {
    going: 0,
    maybe: 0,
    skipping: 0,
    currentUserRsvp: null,
  }
}

function mapRsvpCounts(rows: RsvpRow[], currentUserId: string) {
  const counts = new Map<string, RsvpCounts>()

  rows.forEach((row) => {
    const current = counts.get(row.pass_prediction_id) ?? emptyRsvpCounts()

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

    counts.set(row.pass_prediction_id, current)
  })

  return counts
}

function getAlertPreferenceDefaults(preference?: AlertPreferenceRow | null) {
  return {
    emailEnabled: preference?.email_enabled ?? true,
    leadMinutes: preference?.lead_minutes ?? 30,
  }
}

function mapDeliverySet(rows: NotificationDeliveryRow[]) {
  return new Set(
    rows.map((row) => `${row.group_id}:${row.pass_prediction_id}`)
  )
}

export async function getUpcomingPassesForGroup(groupId: string) {
  return getGroupPassFeed(groupId)
}

export async function getGroupPassFeed(
  groupId: string
): Promise<GroupPassFeedResult> {
  try {
    const user = await requireUser()

    const supabase = await createServerSupabaseClient()
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("id,owner_id,name,description,created_at,updated_at")
      .eq("id", groupId)
      .maybeSingle()

    if (groupError) {
      return { passes: [], hasStale: false, warnings: [], error: groupError.message }
    }

    if (!group) {
      return { passes: [], hasStale: false, warnings: [] }
    }

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("group_subscriptions")
      .select(
        "id,group_id,location_id,satellite_id,pass_type,min_elevation,min_visibility_seconds,days_ahead,alerts_enabled,created_at,updated_at"
      )
      .eq("group_id", groupId)

    if (subscriptionsError) {
      return {
        passes: [],
        hasStale: false,
        warnings: [],
        error: subscriptionsError.message,
      }
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { passes: [], hasStale: false, warnings: [] }
    }

    const warnings: string[] = []
    const { data: alertPreference, error: alertPreferenceError } = await supabase
      .from("alert_preferences")
      .select(
        "id,user_id,group_id,email_enabled,lead_minutes,created_at,updated_at"
      )
      .eq("user_id", user.id)
      .eq("group_id", groupId)
      .maybeSingle()

    if (alertPreferenceError) {
      warnings.push("Alert preference could not be loaded; using defaults.")
    }

    const alertSettings = getAlertPreferenceDefaults(alertPreference)
    const passResults = await Promise.all(
      subscriptions.map((subscription) =>
        supabase
        .from("pass_predictions")
        .select(
          "id,satellite_id,location_id,pass_type,source,start_utc,max_utc,end_utc,start_az,start_az_compass,start_el,max_az,max_az_compass,max_el,end_az,end_az_compass,end_el,magnitude,duration_seconds,score,daylight_label,daylight_context,daylight_fetched_at,raw,fetched_at,cache_key,created_at"
        )
          .eq("satellite_id", subscription.satellite_id)
          .eq("location_id", subscription.location_id)
          .eq("pass_type", subscription.pass_type)
          .gte("end_utc", new Date().toISOString())
          .order("start_utc", { ascending: true })
          .limit(10)
      )
    )
    const predictionRows = passResults.flatMap((result) => result.data ?? [])
    const uniquePredictions = Array.from(
      new Map(predictionRows.map((row) => [row.cache_key, row])).values()
    ).sort(
      (a, b) =>
        new Date(a.start_utc).getTime() - new Date(b.start_utc).getTime()
    )
    const predictionIds = uniquePredictions.map((row) => row.id)
    const [{ data: rsvps }, { data: deliveries }] =
      predictionIds.length > 0
        ? await Promise.all([
            supabase
              .from("pass_rsvps")
              .select(
                "id,group_id,pass_prediction_id,user_id,status,note,created_at,updated_at"
              )
              .eq("group_id", groupId)
              .in("pass_prediction_id", predictionIds),
            supabase
              .from("notification_deliveries")
              .select(
                "id,user_id,group_id,pass_prediction_id,channel,lead_minutes,status,sent_at,provider_message_id,metadata"
              )
              .eq("user_id", user.id)
              .eq("group_id", groupId)
              .eq("channel", "email")
              .eq("status", "sent")
              .in("pass_prediction_id", predictionIds),
          ])
        : [
            { data: [] as RsvpRow[] },
            { data: [] as NotificationDeliveryRow[] },
          ]
    const rsvpCounts = mapRsvpCounts(rsvps ?? [], user.id)
    const deliverySet = mapDeliverySet(deliveries ?? [])
    const satelliteIds = [
      ...new Set(uniquePredictions.map((row) => row.satellite_id)),
    ]
    const locationIds = [...new Set(uniquePredictions.map((row) => row.location_id))]
    const [{ data: satellites }, { data: locations }] = await Promise.all([
      satelliteIds.length > 0
        ? supabase
            .from("satellites")
            .select(
              "id,norad_id,name,category,description,is_curated,created_at,updated_at"
            )
            .in("id", satelliteIds)
        : Promise.resolve({ data: [] as SatelliteRow[] }),
      locationIds.length > 0
        ? supabase
            .from("locations")
            .select(
              "id,user_id,name,label,latitude,longitude,elevation_m,timezone,country,is_default,created_at,updated_at"
            )
            .in("id", locationIds)
        : Promise.resolve({ data: [] as LocationRow[] }),
    ])
    const satelliteMap = new Map(
      (satellites ?? []).map((satellite) => [satellite.id, satellite])
    )
    const locationMap = new Map(
      (locations ?? []).map((location) => [location.id, location])
    )
    const subscriptionMap = new Map(
      subscriptions.map((subscription) => [subscriptionKey(subscription), subscription])
    )
    const passes = uniquePredictions.slice(0, 12).map((row) => {
      const satellite = satelliteMap.get(row.satellite_id)
      const location = locationMap.get(row.location_id)
      const subscription = subscriptionMap.get(predictionKey(row))

      return mapPassPredictionToPassCardViewModel(row, {
        groupId,
        passPredictionId: row.id,
        groupName: group.name,
        satelliteName: satellite?.name ?? "Satellite",
        timezone: location?.timezone,
        alertsEnabled: subscription?.alerts_enabled,
        userEmailAlertsEnabled: alertSettings.emailEnabled,
        alertDeliveryExists: deliverySet.has(`${groupId}:${row.id}`),
        minElevation: subscription?.min_elevation,
        minVisibilitySeconds: subscription?.min_visibility_seconds,
        rsvpCounts: rsvpCounts.get(row.id),
      })
    })
    const hasStale = passes.some((pass) => pass.dataState === "stale")

    return {
      passes,
      hasStale,
      warnings: [
        ...warnings,
        ...(hasStale
          ? ["Showing cached pass data. Live provider unavailable or rate-limited."]
          : []),
      ],
    }
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return {
        passes: [],
        hasStale: false,
        warnings: [],
        error:
          "Supabase environment variables are required to load pass predictions.",
      }
    }

    throw error
  }
}
