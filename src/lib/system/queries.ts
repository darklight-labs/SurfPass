import "server-only"

import { EnvValidationError } from "@/lib/env"
import { requireUser } from "@/lib/auth/guards"
import { isCacheFresh } from "@/lib/passes/cache"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type PassPredictionRow = Database["public"]["Tables"]["pass_predictions"]["Row"]
type GroupSubscriptionRow =
  Database["public"]["Tables"]["group_subscriptions"]["Row"]
type NotificationDeliveryRow =
  Database["public"]["Tables"]["notification_deliveries"]["Row"]
type ApiFetchLogRow = Database["public"]["Tables"]["api_fetch_logs"]["Row"]
type DeliveryEvidenceRow = Pick<
  NotificationDeliveryRow,
  | "id"
  | "user_id"
  | "group_id"
  | "pass_prediction_id"
  | "channel"
  | "lead_minutes"
  | "status"
  | "sent_at"
  | "provider_message_id"
>
type ProviderLogRow = Pick<
  ApiFetchLogRow,
  | "id"
  | "provider"
  | "endpoint"
  | "status"
  | "status_code"
  | "message"
  | "created_at"
>

type CachePredictionRow = Pick<
  PassPredictionRow,
  | "id"
  | "satellite_id"
  | "location_id"
  | "pass_type"
  | "start_utc"
  | "end_utc"
  | "fetched_at"
  | "cache_key"
>

export type CacheEvidenceViewModel = {
  totalPredictions: number
  liveCount: number
  cachedCount: number
  staleCount: number
  newestFetchedAt?: string
  oldestFetchedAt?: string
}

export type ProviderLogViewModel = {
  id: string
  provider: string
  endpoint: string
  status: string
  statusCode?: number | null
  message?: string | null
  createdAt: string
}

export type NotificationDeliveryEvidence = {
  id: string
  groupName: string
  satelliteName: string
  passStartUtc?: string
  channel: string
  leadMinutes: number
  status: "pending" | "sent" | "failed"
  sentAt?: string | null
  providerMessageId?: string | null
}

export type AlertReadinessEvidence = {
  totalSubscriptions: number
  alertsEnabledSubscriptions: number
  membersWithEmailAlertsEnabled?: number | null
  currentUserEmailEnabled: boolean
  currentUserLeadMinutes: number
  currentUserPreferencePersisted: boolean
  cronReadinessNote: string
  manualAlertReady: boolean
}

export type SystemEvidenceResult = {
  cache: CacheEvidenceViewModel
  providerLogs: ProviderLogViewModel[]
  notificationDeliveries: NotificationDeliveryEvidence[]
  alertReadiness: AlertReadinessEvidence
  warnings: string[]
  error?: string
}

function emptyCache(): CacheEvidenceViewModel {
  return {
    totalPredictions: 0,
    liveCount: 0,
    cachedCount: 0,
    staleCount: 0,
  }
}

function dataStateForFetchedAt(fetchedAt: string): "live" | "cached" | "stale" {
  const fetched = new Date(fetchedAt)
  const ageMs = Date.now() - fetched.getTime()

  if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= 15 * 60 * 1000) {
    return "live"
  }

  return isCacheFresh(fetched) ? "cached" : "stale"
}

function mapCacheEvidence(rows: CachePredictionRow[]): CacheEvidenceViewModel {
  if (rows.length === 0) {
    return emptyCache()
  }

  const uniqueRows = [
    ...new Map(rows.map((row) => [row.cache_key, row])).values(),
  ]
  const fetchedTimes = uniqueRows
    .map((row) => new Date(row.fetched_at).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  const counts = uniqueRows.reduce(
    (acc, row) => {
      const state = dataStateForFetchedAt(row.fetched_at)
      acc[state] += 1
      return acc
    },
    {
      live: 0,
      cached: 0,
      stale: 0,
    }
  )

  return {
    totalPredictions: uniqueRows.length,
    liveCount: counts.live,
    cachedCount: counts.cached,
    staleCount: counts.stale,
    oldestFetchedAt:
      fetchedTimes.length > 0
        ? new Date(fetchedTimes[0]).toISOString()
        : undefined,
    newestFetchedAt:
      fetchedTimes.length > 0
        ? new Date(fetchedTimes[fetchedTimes.length - 1]).toISOString()
        : undefined,
  }
}

function mapProviderLog(row: ProviderLogRow): ProviderLogViewModel {
  return {
    id: row.id,
    provider: row.provider,
    endpoint: row.endpoint,
    status: row.status,
    statusCode: row.status_code,
    message: row.message,
    createdAt: row.created_at,
  }
}

function mapDeliveryEvidence({
  delivery,
  groupName,
  pass,
  satelliteName,
}: {
  delivery: DeliveryEvidenceRow
  groupName: string
  pass?: Pick<PassPredictionRow, "id" | "satellite_id" | "start_utc">
  satelliteName?: string
}): NotificationDeliveryEvidence {
  return {
    id: delivery.id,
    groupName,
    satelliteName: satelliteName ?? "Satellite",
    passStartUtc: pass?.start_utc,
    channel: delivery.channel,
    leadMinutes: delivery.lead_minutes,
    status: delivery.status,
    sentAt: delivery.sent_at,
    providerMessageId: delivery.provider_message_id,
  }
}

async function getProviderLogsForGroup(groupId: string) {
  try {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from("api_fetch_logs")
      .select("id,provider,endpoint,status,status_code,message,created_at")
      .contains("metadata", { groupId })
      .order("created_at", { ascending: false })
      .limit(8)

    if (error) {
      return {
        logs: [] as ProviderLogViewModel[],
        warning: "Provider logs could not be loaded for this group.",
      }
    }

    return {
      logs: (data ?? []).map(mapProviderLog),
    }
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return {
        logs: [] as ProviderLogViewModel[],
        warning:
          "Provider logs require the server-only Supabase service role configuration.",
      }
    }

    throw error
  }
}

async function getMembersWithEmailAlertsEnabled(groupId: string) {
  try {
    const admin = createAdminSupabaseClient()
    const [{ data: members, error: membersError }, { data: preferences, error: preferencesError }] =
      await Promise.all([
        admin
          .from("group_members")
          .select("user_id")
          .eq("group_id", groupId),
        admin
          .from("alert_preferences")
          .select("user_id,email_enabled")
          .eq("group_id", groupId),
      ])

    if (membersError || preferencesError) {
      return {
        count: null,
        warning: "Group alert preference counts could not be loaded.",
      }
    }

    const preferenceMap = new Map(
      (preferences ?? []).map((preference) => [
        preference.user_id,
        preference.email_enabled,
      ])
    )

    return {
      count: (members ?? []).filter(
        (member) => preferenceMap.get(member.user_id) ?? true
      ).length,
    }
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return {
        count: null,
        warning:
          "Group alert preference counts require the server-only Supabase service role configuration.",
      }
    }

    throw error
  }
}

async function getCacheRowsForSubscriptions(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  subscriptions: GroupSubscriptionRow[]
) {
  const results = await Promise.all(
    subscriptions.map((subscription) =>
      supabase
        .from("pass_predictions")
        .select(
          "id,satellite_id,location_id,pass_type,start_utc,end_utc,fetched_at,cache_key"
        )
        .eq("satellite_id", subscription.satellite_id)
        .eq("location_id", subscription.location_id)
        .eq("pass_type", subscription.pass_type)
        .order("start_utc", { ascending: false })
        .limit(100)
    )
  )

  return {
    rows: results.flatMap((result) => result.data ?? []) as CachePredictionRow[],
    warning: results.some((result) => result.error)
      ? "Some cached pass predictions could not be loaded."
      : undefined,
  }
}

export async function getSystemEvidenceForGroup(
  groupId: string
): Promise<SystemEvidenceResult> {
  try {
    const user = await requireUser()
    const supabase = await createServerSupabaseClient()
    const [
      { data: membership, error: membershipError },
      { data: group, error: groupError },
      { data: subscriptions, error: subscriptionsError },
      { data: currentPreference, error: currentPreferenceError },
    ] = await Promise.all([
      supabase
        .from("group_members")
        .select("group_id,user_id,role,created_at")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("groups")
        .select("id,owner_id,name,description,created_at,updated_at")
        .eq("id", groupId)
        .maybeSingle(),
      supabase
        .from("group_subscriptions")
        .select(
          "id,group_id,location_id,satellite_id,pass_type,min_elevation,min_visibility_seconds,days_ahead,alerts_enabled,created_at,updated_at"
        )
        .eq("group_id", groupId),
      supabase
        .from("alert_preferences")
        .select(
          "id,user_id,group_id,email_enabled,lead_minutes,created_at,updated_at"
        )
        .eq("user_id", user.id)
        .eq("group_id", groupId)
        .maybeSingle(),
    ])

    if (membershipError || groupError || subscriptionsError) {
      return {
        cache: emptyCache(),
        providerLogs: [],
        notificationDeliveries: [],
        alertReadiness: {
          totalSubscriptions: 0,
          alertsEnabledSubscriptions: 0,
          membersWithEmailAlertsEnabled: null,
          currentUserEmailEnabled: true,
          currentUserLeadMinutes: 30,
          currentUserPreferencePersisted: false,
          cronReadinessNote:
            "Cron readiness depends on CRON_SECRET and Vercel Cron configuration.",
          manualAlertReady: false,
        },
        warnings: [],
        error:
          membershipError?.message ??
          groupError?.message ??
          subscriptionsError?.message ??
          "System evidence could not be loaded.",
      }
    }

    if (!membership || !group) {
      return {
        cache: emptyCache(),
        providerLogs: [],
        notificationDeliveries: [],
        alertReadiness: {
          totalSubscriptions: 0,
          alertsEnabledSubscriptions: 0,
          membersWithEmailAlertsEnabled: null,
          currentUserEmailEnabled: true,
          currentUserLeadMinutes: 30,
          currentUserPreferencePersisted: false,
          cronReadinessNote:
            "Cron readiness depends on CRON_SECRET and Vercel Cron configuration.",
          manualAlertReady: false,
        },
        warnings: [],
        error: "Only group members can view system evidence for this group.",
      }
    }

    const warnings: string[] = []

    if (currentPreferenceError) {
      warnings.push("Current user's alert preference could not be loaded.")
    }

    const subscriptionRows = subscriptions ?? []
    const alertEnabledSubscriptions = subscriptionRows.filter(
      (subscription) => subscription.alerts_enabled
    ).length
    const [
      cacheRowsResult,
      { data: deliveries, error: deliveriesError },
      providerLogsResult,
      emailEnabledMembersResult,
    ] = await Promise.all([
      getCacheRowsForSubscriptions(supabase, subscriptionRows),
      supabase
        .from("notification_deliveries")
        .select(
          "id,user_id,group_id,pass_prediction_id,channel,lead_minutes,status,sent_at,provider_message_id"
        )
        .eq("user_id", user.id)
        .eq("group_id", groupId),
      getProviderLogsForGroup(groupId),
      getMembersWithEmailAlertsEnabled(groupId),
    ])

    if (cacheRowsResult.warning) {
      warnings.push(cacheRowsResult.warning)
    }

    if (deliveriesError) {
      warnings.push("Notification deliveries could not be loaded.")
    }

    if (providerLogsResult.warning) {
      warnings.push(providerLogsResult.warning)
    }

    if (emailEnabledMembersResult.warning) {
      warnings.push(emailEnabledMembersResult.warning)
    }

    const deliveryRows = deliveries ?? []
    const passIds = [
      ...new Set(deliveryRows.map((delivery) => delivery.pass_prediction_id)),
    ]
    const { data: deliveryPasses } =
      passIds.length > 0
        ? await supabase
            .from("pass_predictions")
            .select("id,satellite_id,start_utc")
            .in("id", passIds)
        : { data: [] as Pick<PassPredictionRow, "id" | "satellite_id" | "start_utc">[] }
    const satelliteIds = [
      ...new Set((deliveryPasses ?? []).map((pass) => pass.satellite_id)),
    ]
    const { data: satellites } =
      satelliteIds.length > 0
        ? await supabase
            .from("satellites")
            .select("id,name")
            .in("id", satelliteIds)
        : { data: [] as { id: string; name: string }[] }
    const passMap = new Map((deliveryPasses ?? []).map((pass) => [pass.id, pass]))
    const satelliteMap = new Map(
      (satellites ?? []).map((satellite) => [satellite.id, satellite.name])
    )
    const currentUserEmailEnabled = currentPreference?.email_enabled ?? true
    const currentUserLeadMinutes = currentPreference?.lead_minutes ?? 30
    const cache = mapCacheEvidence(cacheRowsResult.rows)

    return {
      cache,
      providerLogs: providerLogsResult.logs,
      notificationDeliveries: deliveryRows
        .map((delivery) => {
          const pass = passMap.get(delivery.pass_prediction_id)

          return mapDeliveryEvidence({
            delivery,
            groupName: group.name,
            pass,
            satelliteName: pass
              ? satelliteMap.get(pass.satellite_id)
              : undefined,
          })
        })
        .sort((a, b) => {
          const aTime = a.sentAt ? new Date(a.sentAt).getTime() : 0
          const bTime = b.sentAt ? new Date(b.sentAt).getTime() : 0
          return bTime - aTime
        })
        .slice(0, 8),
      alertReadiness: {
        totalSubscriptions: subscriptionRows.length,
        alertsEnabledSubscriptions: alertEnabledSubscriptions,
        membersWithEmailAlertsEnabled: emailEnabledMembersResult.count,
        currentUserEmailEnabled,
        currentUserLeadMinutes,
        currentUserPreferencePersisted: Boolean(currentPreference),
        cronReadinessNote:
          "Cron route is protected by CRON_SECRET and reads cached predictions only.",
        manualAlertReady:
          currentUserEmailEnabled &&
          alertEnabledSubscriptions > 0 &&
          cache.totalPredictions > 0,
      },
      warnings: [...new Set(warnings)],
    }
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return {
        cache: emptyCache(),
        providerLogs: [],
        notificationDeliveries: [],
        alertReadiness: {
          totalSubscriptions: 0,
          alertsEnabledSubscriptions: 0,
          membersWithEmailAlertsEnabled: null,
          currentUserEmailEnabled: true,
          currentUserLeadMinutes: 30,
          currentUserPreferencePersisted: false,
          cronReadinessNote:
            "Cron readiness depends on Supabase and Vercel environment configuration.",
          manualAlertReady: false,
        },
        warnings: [],
        error:
          "Supabase environment variables are required to load system evidence.",
      }
    }

    throw error
  }
}
