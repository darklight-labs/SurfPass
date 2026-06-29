import "server-only"

import {
  classifyLightContext,
  getDateForTimeZone,
  type SunEvents,
} from "@/lib/daylight/classify"
import { getSunEvents } from "@/lib/daylight/sunrise-sunset"
import { getRadioPasses, getVisualPasses, N2yoLookupError } from "@/lib/n2yo/client"
import {
  normaliseRadioPasses,
  normaliseVisualPasses,
} from "@/lib/n2yo/normalise"
import { EnvValidationError } from "@/lib/env"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import type { Json } from "@/types/database"
import type { Database } from "@/types/database"
import type { NormalisedPassPrediction, PassType } from "@/types/domain"

type AdminClient = ReturnType<typeof createAdminSupabaseClient>
type PassPredictionRow = Database["public"]["Tables"]["pass_predictions"]["Row"]
type GroupSubscriptionRow =
  Database["public"]["Tables"]["group_subscriptions"]["Row"]
type LocationRow = Database["public"]["Tables"]["locations"]["Row"]
type SatelliteRow = Database["public"]["Tables"]["satellites"]["Row"]
type DaylightLookupCache = Map<string, Promise<SunEvents>>
const PASS_START_GRACE_MINUTES = 5

export type RefreshPassWarningReason =
  | "provider_returned_no_passes"
  | "provider_error"
  | "provider_invalid_response"
  | "normalisation_failed"
  | "subscription_load_failed"
  | "cache_write_failed"
  | "api_fetch_log_failed"
  | "stale_cache_used"
  | "daylight_enrichment_failed"
  | "subscription_missing_reference"

export type RefreshFailureReason =
  | "not_authenticated"
  | "not_group_member"
  | "no_subscriptions"
  | "missing_n2yo_api_key"
  | "missing_supabase_service_role_key"
  | "subscription_load_failed"
  | "provider_error"
  | "provider_invalid_response"
  | "provider_returned_no_passes"
  | "normalisation_failed"
  | "cache_write_failed"
  | "api_fetch_log_failed"
  | "unknown_refresh_error"

export type RefreshPassesReason =
  | "refresh_completed"
  | "refresh_completed_with_warnings"
  | "no_subscriptions"
  | "provider_returned_no_passes"
  | RefreshFailureReason

export type RefreshPassWarning = {
  subscriptionId?: string
  satelliteName?: string
  passType?: PassType
  reason: RefreshPassWarningReason
  message: string
}

export type RefreshPassesSummary = {
  ok: true
  reason: RefreshPassesReason
  message: string
  groupId: string
  subscriptionsChecked: number
  providerFetchesAttempted: number
  providerSuccesses: number
  providerZeroResultSubscriptions: number
  providerFailures: number
  providerFetches: number
  cacheHits: number
  passesStored: number
  passesRendered: number
  passesNormalised: number
  passesUpserted: number
  warnings: RefreshPassWarning[]
}

type SubscriptionRefreshSummary = {
  providerFetches: number
  providerSuccesses: number
  providerZeroResultSubscriptions: number
  providerFailures: number
  cacheHits: number
  passesAvailable: number
  passesNormalised: number
  passesUpserted: number
  warnings: RefreshPassWarning[]
  infrastructureFailures: RefreshFailureRecord[]
}

export type RefreshFailureRecord = {
  reason: RefreshFailureReason
  message: string
  details?: Record<string, unknown>
}

export class PassRefreshError extends Error {
  reason: RefreshFailureReason
  details?: Record<string, unknown>
  status: number

  constructor(
    reason: RefreshFailureReason,
    message: string,
    details?: Record<string, unknown>,
    status = 503
  ) {
    super(message)
    this.name = "PassRefreshError"
    this.reason = reason
    this.details = details
    this.status = status
  }
}

type RefreshableSubscription = {
  id: string
  groupId: string
  passType: PassType
  minElevation: number
  minVisibilitySeconds: number
  daysAhead: number
  location: {
    id: string
    latitude: number
    longitude: number
    elevationM: number
    timezone?: string | null
  }
  satellite: {
    id: string
    noradId: number
    name: string
  }
}

function emptySummary(groupId: string): RefreshPassesSummary {
  return {
    ok: true,
    reason: "refresh_completed",
    message: "Pass refresh completed.",
    groupId,
    subscriptionsChecked: 0,
    providerFetchesAttempted: 0,
    providerSuccesses: 0,
    providerZeroResultSubscriptions: 0,
    providerFailures: 0,
    providerFetches: 0,
    cacheHits: 0,
    passesStored: 0,
    passesRendered: 0,
    passesNormalised: 0,
    passesUpserted: 0,
    warnings: [],
  }
}

function addWarning<
  T extends {
    warnings: RefreshPassWarning[]
    reason?: RefreshPassesReason
  },
>(
  summary: T,
  warning: RefreshPassWarning
) {
  summary.warnings.push(warning)

  if ("reason" in summary) {
    summary.reason = "refresh_completed_with_warnings"
  }
}

function safeErrorDetails(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== "object") {
    return { message: String(error) }
  }

  const record = error as Record<string, unknown>

  return {
    name: record.name,
    code: record.code,
    message: record.message,
    details: record.details,
    hint: record.hint,
    status: record.status,
    providerStatus: record.providerStatus,
  }
}

function createRefreshError(
  reason: RefreshFailureReason,
  message: string,
  details?: Record<string, unknown>,
  status = 503
) {
  return new PassRefreshError(reason, message, details, status)
}

function providerFailureReason(error: unknown): RefreshFailureReason {
  if (error instanceof N2yoLookupError) {
    if (error.code === "configuration") {
      return "missing_n2yo_api_key"
    }

    if (error.code === "unexpected_response") {
      return "provider_invalid_response"
    }
  }

  return "provider_error"
}

function failureRecord(
  reason: RefreshFailureReason,
  message: string,
  details?: Record<string, unknown>
): RefreshFailureRecord {
  return { reason, message, details }
}

export function isCacheFresh(fetchedAt: string | Date, freshnessHours = 6) {
  const fetched = typeof fetchedAt === "string" ? new Date(fetchedAt) : fetchedAt
  const ageMs = Date.now() - fetched.getTime()

  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= freshnessHours * 60 * 60 * 1000
}

export function getPassPredictionStartLowerBound(
  now = new Date(),
  graceMinutes = PASS_START_GRACE_MINUTES
) {
  return new Date(now.getTime() - graceMinutes * 60 * 1000).toISOString()
}

function hasFreshCachedPassRows(rows: PassPredictionRow[]) {
  return rows.length > 0 && rows.some((row) => isCacheFresh(row.fetched_at))
}

export async function getCachedPassesForSubscription(
  client: AdminClient,
  subscription: RefreshableSubscription
): Promise<PassPredictionRow[]> {
  const { data, error } = await client
    .from("pass_predictions")
    .select(
      "id,satellite_id,location_id,pass_type,source,start_utc,max_utc,end_utc,start_az,start_az_compass,start_el,max_az,max_az_compass,max_el,end_az,end_az_compass,end_el,magnitude,duration_seconds,score,daylight_label,daylight_context,daylight_fetched_at,raw,fetched_at,cache_key,created_at"
    )
    .eq("satellite_id", subscription.satellite.id)
    .eq("location_id", subscription.location.id)
    .eq("pass_type", subscription.passType)
    .gte("start_utc", getPassPredictionStartLowerBound())
    .order("start_utc", { ascending: true })
    .limit(20)

  if (error) {
    throw error
  }

  return data ?? []
}

export async function upsertPassPredictions(
  client: AdminClient,
  passes: NormalisedPassPrediction[],
  fetchedAt = new Date()
) {
  if (passes.length === 0) {
    return 0
  }

  const fetchedAtIso = fetchedAt.toISOString()
  const rows: Database["public"]["Tables"]["pass_predictions"]["Insert"][] =
    passes.map((pass) => ({
      satellite_id: pass.satelliteId,
      location_id: pass.locationId,
      pass_type: pass.passType,
      source: "n2yo",
      start_utc: pass.startUtc,
      max_utc: pass.maxUtc,
      end_utc: pass.endUtc,
      start_az: pass.startAz ?? null,
      start_az_compass: pass.startAzCompass ?? null,
      start_el: pass.startEl ?? null,
      max_az: pass.maxAz ?? null,
      max_az_compass: pass.maxAzCompass ?? null,
      max_el: pass.maxEl ?? null,
      end_az: pass.endAz ?? null,
      end_az_compass: pass.endAzCompass ?? null,
      end_el: pass.endEl ?? null,
      magnitude: pass.magnitude ?? null,
      duration_seconds: pass.durationSeconds ?? null,
      score: pass.score,
      daylight_label: pass.daylightLabel ?? null,
      daylight_context: pass.daylightContext ?? null,
      daylight_fetched_at: pass.daylightFetchedAt ?? null,
      raw: pass.raw ?? null,
      fetched_at: fetchedAtIso,
      cache_key: pass.cacheKey,
    }))

  const { data, error } = await client
    .from("pass_predictions")
    .upsert(rows, { onConflict: "cache_key" })
    .select("id")

  if (error) {
    console.error("[SurfPass refresh]", {
      step: "upsert_failed",
      error: safeErrorDetails(error),
    })

    throw createRefreshError(
      "cache_write_failed",
      "Pass predictions could not be written to the cache after N2YO returned data.",
      safeErrorDetails(error)
    )
  }

  const storedCount = data?.length ?? 0

  if (storedCount === 0) {
    const details = {
      attemptedRows: rows.length,
      message: "Supabase upsert completed without returning stored rows.",
    }

    console.error("[SurfPass refresh]", {
      step: "upsert_failed",
      error: details,
    })

    throw createRefreshError(
      "cache_write_failed",
      "Passes were fetched but no pass prediction rows were stored.",
      details
    )
  }

  return storedCount
}

async function logProviderFetch(
  client: AdminClient,
  input: {
    provider: "n2yo" | "sunrise-sunset"
    endpoint: string
    status: "success" | "error"
    statusCode?: number
    message?: string
    metadata?: Json
  }
) {
  let error: unknown

  try {
    const result = await client.from("api_fetch_logs").insert({
      provider: input.provider,
      endpoint: input.endpoint,
      status: input.status,
      status_code: input.statusCode ?? null,
      message: input.message ?? null,
      metadata: input.metadata ?? null,
    })
    error = result.error
  } catch (caught) {
    error = caught
  }

  if (error) {
    console.error("[SurfPass refresh]", {
      step: "api_fetch_log_failed",
      provider: input.provider,
      endpoint: input.endpoint,
      status: input.status,
      error: safeErrorDetails(error),
    })

    return false
  }

  return true
}

function providerWarning(subscription: RefreshableSubscription, error: unknown) {
  if (error instanceof N2yoLookupError) {
    if (error.code === "configuration") {
      return "N2YO_API_KEY is not configured, so live pass refresh is unavailable."
    }

    return "N2YO provider error. Check provider key/quota or try again."
  }

  return "N2YO provider error. Check provider key/quota or try again."
}

function endpointForPassType(passType: PassType) {
  return passType === "visual" ? "visualpasses" : "radiopasses"
}

function noPassWarning(subscription: RefreshableSubscription): RefreshPassWarning {
  return {
    subscriptionId: subscription.id,
    satelliteName: subscription.satellite.name,
    passType: subscription.passType,
    reason: "provider_returned_no_passes",
    message:
      "No provider windows returned for this subscription. Try radio mode, lower threshold, or extend days ahead.",
  }
}

function providerErrorWarning(
  subscription: RefreshableSubscription,
  error: unknown
): RefreshPassWarning {
  const reason = providerFailureReason(error)

  return {
    subscriptionId: subscription.id,
    satelliteName: subscription.satellite.name,
    passType: subscription.passType,
    reason:
      reason === "provider_invalid_response"
        ? "provider_invalid_response"
        : "provider_error",
    message: providerWarning(subscription, error),
  }
}

function daylightLookupKey(input: {
  latitude: number
  longitude: number
  date: string
  timezone?: string | null
}) {
  return [
    input.latitude.toFixed(4),
    input.longitude.toFixed(4),
    input.date,
    input.timezone ?? "utc",
  ].join(":")
}

function daylightErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Sunrise-Sunset daylight enrichment failed."
}

function getCachedSunEvents(
  cache: DaylightLookupCache,
  input: {
    latitude: number
    longitude: number
    date: string
    timezone?: string | null
  }
) {
  const key = daylightLookupKey(input)
  const cached = cache.get(key)

  if (cached) {
    return cached
  }

  const request = getSunEvents(input)
  cache.set(key, request)
  return request
}

async function enrichPassesWithDaylight(
  passes: NormalisedPassPrediction[],
  subscription: RefreshableSubscription,
  cache: DaylightLookupCache,
  fetchedAt: Date
) {
  const daylightFetchedAt = fetchedAt.toISOString()
  const failures = new Map<string, { date: string; message: string }>()
  const enriched = await Promise.all(
    passes.map(async (pass) => {
      const date = getDateForTimeZone(
        pass.maxUtc,
        subscription.location.timezone
      )

      try {
        const events = await getCachedSunEvents(cache, {
          latitude: subscription.location.latitude,
          longitude: subscription.location.longitude,
          date,
          timezone: subscription.location.timezone,
        })
        const classification = classifyLightContext({
          atUtc: pass.maxUtc,
          events,
        })

        return {
          ...pass,
          daylightLabel: classification.label,
          daylightContext: classification.context as Json,
          daylightFetchedAt,
        }
      } catch (error) {
        const message = daylightErrorMessage(error)
        failures.set(date, { date, message })

        return {
          ...pass,
          daylightLabel: "unknown" as const,
          daylightContext: {
            provider: "sunrise-sunset",
            date,
            basis: "max_utc",
            classifiedAtUtc: pass.maxUtc,
            status: "unavailable",
            message,
          } as Json,
          daylightFetchedAt: null,
        }
      }
    })
  )

  return {
    passes: enriched,
    failures: [...failures.values()],
  }
}

export async function refreshPassesForSubscription(
  client: AdminClient,
  subscription: RefreshableSubscription,
  daylightCache: DaylightLookupCache = new Map()
): Promise<SubscriptionRefreshSummary> {
  const summary: SubscriptionRefreshSummary = {
    providerFetches: 0,
    providerSuccesses: 0,
    providerZeroResultSubscriptions: 0,
    providerFailures: 0,
    cacheHits: 0,
    passesAvailable: 0,
    passesNormalised: 0,
    passesUpserted: 0,
    warnings: [],
    infrastructureFailures: [],
  }
  let cached: PassPredictionRow[]

  try {
    cached = await getCachedPassesForSubscription(client, subscription)
  } catch (error) {
    const message =
      "Cached pass predictions could not be loaded for this subscription."
    addWarning(summary, {
      subscriptionId: subscription.id,
      satelliteName: subscription.satellite.name,
      passType: subscription.passType,
      reason: "subscription_load_failed",
      message,
    })
    summary.infrastructureFailures.push(
      failureRecord("subscription_load_failed", message, {
        subscriptionId: subscription.id,
        satelliteName: subscription.satellite.name,
        passType: subscription.passType,
        error: safeErrorDetails(error),
      })
    )
    return summary
  }

  const cacheIsFresh = hasFreshCachedPassRows(cached)

  console.info("[SurfPass refresh]", {
    step: "cache_check",
    satelliteName: subscription.satellite.name,
    noradId: subscription.satellite.noradId,
    passType: subscription.passType,
    cachedCount: cached.length,
    isFresh: cacheIsFresh,
  })

  if (cacheIsFresh) {
    summary.cacheHits += 1
    summary.passesAvailable += cached.length
    return summary
  }

  summary.providerFetches += 1
  console.info("[SurfPass refresh]", {
    step: "cache_miss_provider_fetch",
    satelliteName: subscription.satellite.name,
    passType: subscription.passType,
  })
  console.info("[SurfPass refresh]", {
    step: "provider_fetch_start",
    satelliteName: subscription.satellite.name,
    noradId: subscription.satellite.noradId,
    passType: subscription.passType,
  })

  const fetchedAt = new Date()
  let passes: NormalisedPassPrediction[]

  try {
    const providerResponse =
      subscription.passType === "visual"
        ? await getVisualPasses({
            noradId: subscription.satellite.noradId,
            latitude: subscription.location.latitude,
            longitude: subscription.location.longitude,
            elevationM: subscription.location.elevationM,
            days: subscription.daysAhead,
            minVisibilitySeconds: subscription.minVisibilitySeconds,
          })
        : await getRadioPasses({
            noradId: subscription.satellite.noradId,
            latitude: subscription.location.latitude,
            longitude: subscription.location.longitude,
            elevationM: subscription.location.elevationM,
            days: subscription.daysAhead,
            minElevation: subscription.minElevation,
          })

    console.info("[SurfPass refresh]", {
      step: "provider_fetch_done",
      satelliteName: subscription.satellite.name,
      noradId: subscription.satellite.noradId,
      passType: subscription.passType,
      passCount: providerResponse.passes.length,
    })
    summary.providerSuccesses += 1

    try {
      passes =
        subscription.passType === "visual"
          ? normaliseVisualPasses(providerResponse, {
              satelliteId: subscription.satellite.id,
              locationId: subscription.location.id,
            })
          : normaliseRadioPasses(providerResponse, {
              satelliteId: subscription.satellite.id,
              locationId: subscription.location.id,
            })
    } catch (error) {
      const message = `N2YO returned ${subscription.satellite.name} data, but SurfPass could not normalise it.`
      addWarning(summary, {
        subscriptionId: subscription.id,
        satelliteName: subscription.satellite.name,
        passType: subscription.passType,
        reason: "normalisation_failed",
        message,
      })

      await logProviderFetch(client, {
        provider: "n2yo",
        endpoint: endpointForPassType(subscription.passType),
        status: "error",
        message: "Provider response normalisation failed.",
        metadata: {
          groupId: subscription.groupId,
          subscriptionId: subscription.id,
          satelliteId: subscription.satellite.id,
          satelliteName: subscription.satellite.name,
          locationId: subscription.location.id,
          passType: subscription.passType,
          error: safeErrorDetails(error),
        } as Json,
      })

      if (cached.length > 0) {
        summary.passesAvailable += cached.length
        addWarning(summary, {
          subscriptionId: subscription.id,
          satelliteName: subscription.satellite.name,
          passType: subscription.passType,
          reason: "stale_cache_used",
          message: `Showing stale cached pass data for ${subscription.satellite.name}.`,
        })
      } else {
        summary.infrastructureFailures.push(
          failureRecord("normalisation_failed", message, {
            subscriptionId: subscription.id,
            satelliteName: subscription.satellite.name,
            passType: subscription.passType,
            error: safeErrorDetails(error),
          })
        )
      }

      return summary
    }
  } catch (error) {
    const reason = providerFailureReason(error)
    summary.providerFailures += 1

    const warning = providerErrorWarning(subscription, error)
    addWarning(summary, warning)
    console.error("[SurfPass refresh]", {
      step: "provider_fetch_failed",
      satelliteName: subscription.satellite.name,
      noradId: subscription.satellite.noradId,
      passType: subscription.passType,
      error: safeErrorDetails(error),
    })

    if (cached.length > 0) {
      summary.passesAvailable += cached.length
      addWarning(summary, {
        subscriptionId: subscription.id,
        satelliteName: subscription.satellite.name,
        passType: subscription.passType,
        reason: "stale_cache_used",
        message: `Showing stale cached pass data for ${subscription.satellite.name}.`,
      })
    } else {
      summary.infrastructureFailures.push(
        failureRecord(reason, warning.message, {
          subscriptionId: subscription.id,
          satelliteName: subscription.satellite.name,
          passType: subscription.passType,
          providerCode:
            error instanceof N2yoLookupError ? error.code : "unknown",
          providerStatus:
            error instanceof N2yoLookupError
              ? error.providerStatus
              : undefined,
        })
      )
    }

    await logProviderFetch(client, {
      provider: "n2yo",
      endpoint: endpointForPassType(subscription.passType),
      status: "error",
      statusCode: error instanceof N2yoLookupError ? error.providerStatus : undefined,
      message: warning.message,
      metadata: {
        groupId: subscription.groupId,
        subscriptionId: subscription.id,
        satelliteId: subscription.satellite.id,
        satelliteName: subscription.satellite.name,
        locationId: subscription.location.id,
        passType: subscription.passType,
      } as Json,
    })

    return summary
  }

  summary.passesNormalised += passes.length
  console.info("[SurfPass refresh]", {
    step: "normalised",
    satelliteName: subscription.satellite.name,
    noradId: subscription.satellite.noradId,
    passType: subscription.passType,
    count: passes.length,
  })

  if (passes.length === 0) {
    summary.providerZeroResultSubscriptions += 1
    addWarning(summary, noPassWarning(subscription))
    await logProviderFetch(client, {
      provider: "n2yo",
      endpoint: endpointForPassType(subscription.passType),
      status: "success",
      message: `N2YO returned no ${subscription.passType} passes for ${subscription.satellite.name}.`,
      metadata: {
        groupId: subscription.groupId,
        subscriptionId: subscription.id,
        satelliteId: subscription.satellite.id,
        satelliteName: subscription.satellite.name,
        locationId: subscription.location.id,
        passType: subscription.passType,
        passesReturned: 0,
        passesNormalised: 0,
      } as Json,
    })

    return summary
  }

  const daylight = await enrichPassesWithDaylight(
    passes,
    subscription,
    daylightCache,
    fetchedAt
  )

  if (daylight.failures.length > 0) {
    addWarning(summary, {
      subscriptionId: subscription.id,
      satelliteName: subscription.satellite.name,
      passType: subscription.passType,
      reason: "daylight_enrichment_failed",
      message:
        "Sunrise-Sunset daylight enrichment was unavailable for some passes; light context is marked unknown.",
    })
    await logProviderFetch(client, {
      provider: "sunrise-sunset",
      endpoint: "json",
      status: "error",
      message: "Daylight enrichment failed for one or more pass dates.",
      metadata: {
        groupId: subscription.groupId,
        subscriptionId: subscription.id,
        satelliteId: subscription.satellite.id,
        locationId: subscription.location.id,
        passType: subscription.passType,
        failures: daylight.failures,
      } as Json,
    })
  }

  let passesUpserted: number

  try {
    passesUpserted = await upsertPassPredictions(
      client,
      daylight.passes,
      fetchedAt
    )
  } catch (error) {
    const message =
      "N2YO returned pass windows, but SurfPass could not store them."
    addWarning(summary, {
      subscriptionId: subscription.id,
      satelliteName: subscription.satellite.name,
      passType: subscription.passType,
      reason: "cache_write_failed",
      message,
    })

    if (cached.length > 0) {
      summary.passesAvailable += cached.length
      addWarning(summary, {
        subscriptionId: subscription.id,
        satelliteName: subscription.satellite.name,
        passType: subscription.passType,
        reason: "stale_cache_used",
        message: `Showing stale cached pass data for ${subscription.satellite.name}.`,
      })
    } else {
      summary.infrastructureFailures.push(
        failureRecord("cache_write_failed", message, {
          subscriptionId: subscription.id,
          satelliteName: subscription.satellite.name,
          passType: subscription.passType,
          error: safeErrorDetails(error),
        })
      )
    }

    return summary
  }

  summary.passesUpserted += passesUpserted
  summary.passesAvailable += passesUpserted
  console.info("[SurfPass refresh]", {
    step: "upsert_done",
    satelliteName: subscription.satellite.name,
    noradId: subscription.satellite.noradId,
    passType: subscription.passType,
    count: passesUpserted,
  })

  await logProviderFetch(client, {
    provider: "n2yo",
    endpoint: endpointForPassType(subscription.passType),
    status: "success",
    message: `${passesUpserted} passes normalised.`,
    metadata: {
      groupId: subscription.groupId,
      subscriptionId: subscription.id,
      satelliteId: subscription.satellite.id,
      satelliteName: subscription.satellite.name,
      locationId: subscription.location.id,
      passType: subscription.passType,
      passesReturned: passes.length,
      passesNormalised: passes.length,
      passesUpserted,
    } as Json,
  })

  return summary
}

function mapRefreshableSubscriptions(
  subscriptions: GroupSubscriptionRow[],
  locations: Map<string, LocationRow>,
  satellites: Map<string, SatelliteRow>
) {
  const result: {
    subscriptions: RefreshableSubscription[]
    warnings: RefreshPassWarning[]
  } = {
    subscriptions: [],
    warnings: [],
  }

  subscriptions.forEach((subscription) => {
    const location = locations.get(subscription.location_id)
    const satellite = satellites.get(subscription.satellite_id)

    if (!location || !satellite) {
      result.warnings.push({
        subscriptionId: subscription.id,
        reason: "subscription_missing_reference",
        message: `Subscription ${subscription.id} is missing its location or satellite record.`,
      })
      return
    }

    result.subscriptions.push({
      id: subscription.id,
      groupId: subscription.group_id,
      passType: subscription.pass_type,
      minElevation: subscription.min_elevation,
      minVisibilitySeconds: subscription.min_visibility_seconds,
      daysAhead: subscription.days_ahead,
      location: {
        id: location.id,
        latitude: location.latitude,
        longitude: location.longitude,
        elevationM: location.elevation_m,
        timezone: location.timezone,
      },
      satellite: {
        id: satellite.id,
        noradId: satellite.norad_id,
        name: satellite.name,
      },
    })
  })

  return result
}

export async function refreshPassesForGroup(
  groupId: string
): Promise<RefreshPassesSummary> {
  let client: AdminClient

  try {
    client = createAdminSupabaseClient()
  } catch (error) {
    if (error instanceof EnvValidationError) {
      throw createRefreshError(
        "missing_supabase_service_role_key",
        "SUPABASE_SERVICE_ROLE_KEY is not configured, so pass predictions cannot be written from the refresh worker.",
        { envVar: "SUPABASE_SERVICE_ROLE_KEY" }
      )
    }

    throw createRefreshError(
      "unknown_refresh_error",
      "Supabase admin client could not be created.",
      safeErrorDetails(error)
    )
  }

  const summary = emptySummary(groupId)
  const { data: subscriptions, error } = await client
    .from("group_subscriptions")
    .select(
      "id,group_id,location_id,satellite_id,pass_type,min_elevation,min_visibility_seconds,days_ahead,alerts_enabled,created_at,updated_at"
    )
    .eq("group_id", groupId)

  if (error) {
    throw createRefreshError(
      "subscription_load_failed",
      "Group subscriptions could not be loaded for pass refresh.",
      safeErrorDetails(error)
    )
  }

  console.info("[SurfPass refresh]", {
    step: "subscriptions_loaded",
    count: subscriptions?.length ?? 0,
  })

  if (!subscriptions || subscriptions.length === 0) {
    summary.reason = "no_subscriptions"
    summary.message =
      "No group subscriptions are configured yet. Add a subscription before refreshing pass data."
    return summary
  }

  const locationIds = [...new Set(subscriptions.map((row) => row.location_id))]
  const satelliteIds = [...new Set(subscriptions.map((row) => row.satellite_id))]
  const [
    { data: locations, error: locationsError },
    { data: satellites, error: satellitesError },
  ] = await Promise.all([
    client
      .from("locations")
      .select(
        "id,user_id,name,label,latitude,longitude,elevation_m,timezone,country,is_default,created_at,updated_at"
      )
      .in("id", locationIds),
    client
      .from("satellites")
      .select("id,norad_id,name,category,description,is_curated,created_at,updated_at")
      .in("id", satelliteIds),
  ])

  if (locationsError || satellitesError) {
    throw createRefreshError(
      "subscription_load_failed",
      "Subscription location or satellite records could not be loaded for pass refresh.",
      {
        locationsError: locationsError ? safeErrorDetails(locationsError) : undefined,
        satellitesError: satellitesError
          ? safeErrorDetails(satellitesError)
          : undefined,
      }
    )
  }

  const mapped = mapRefreshableSubscriptions(
    subscriptions,
    new Map((locations ?? []).map((location) => [location.id, location])),
    new Map((satellites ?? []).map((satellite) => [satellite.id, satellite]))
  )
  const daylightCache: DaylightLookupCache = new Map()
  const infrastructureFailures: RefreshFailureRecord[] = []
  let passesAvailable = 0

  mapped.warnings.forEach((warning) => addWarning(summary, warning))
  summary.subscriptionsChecked = subscriptions.length

  for (const subscription of mapped.subscriptions) {
    let result: SubscriptionRefreshSummary

    try {
      result = await refreshPassesForSubscription(
        client,
        subscription,
        daylightCache
      )
    } catch (error) {
      const failure =
        error instanceof PassRefreshError
          ? failureRecord(error.reason, error.message, error.details)
          : failureRecord(
              "unknown_refresh_error",
              "A subscription failed unexpectedly during pass refresh.",
              safeErrorDetails(error)
            )
      infrastructureFailures.push(failure)
      addWarning(summary, {
        subscriptionId: subscription.id,
        satelliteName: subscription.satellite.name,
        passType: subscription.passType,
        reason: "subscription_load_failed",
        message: failure.message,
      })
      console.error("[SurfPass refresh]", {
        step: "subscription_refresh_failed",
        subscriptionId: subscription.id,
        satelliteName: subscription.satellite.name,
        passType: subscription.passType,
        error: safeErrorDetails(error),
      })
      continue
    }

    summary.providerFetches += result.providerFetches
    summary.providerSuccesses += result.providerSuccesses
    summary.providerZeroResultSubscriptions +=
      result.providerZeroResultSubscriptions
    summary.providerFailures += result.providerFailures
    summary.cacheHits += result.cacheHits
    summary.passesNormalised += result.passesNormalised
    summary.passesUpserted += result.passesUpserted
    passesAvailable += result.passesAvailable
    infrastructureFailures.push(...result.infrastructureFailures)
    result.warnings.forEach((warning) => addWarning(summary, warning))
  }

  summary.providerFetchesAttempted = summary.providerFetches
  summary.passesStored = summary.passesUpserted

  if (
    infrastructureFailures.length > 0 &&
    summary.providerZeroResultSubscriptions === 0 &&
    passesAvailable === 0
  ) {
    const failure = infrastructureFailures[0]

    throw createRefreshError(
      failure?.reason ?? "unknown_refresh_error",
      failure?.message ??
        "Pass refresh failed before any provider data could be cached.",
      {
        ...(failure?.details ?? {}),
        subscriptionsChecked: summary.subscriptionsChecked,
        providerFetchesAttempted: summary.providerFetchesAttempted,
        providerSuccesses: summary.providerSuccesses,
        providerZeroResultSubscriptions:
          summary.providerZeroResultSubscriptions,
        providerFailures: summary.providerFailures,
        providerFetches: summary.providerFetches,
        cacheHits: summary.cacheHits,
        passesStored: summary.passesStored,
        passesRendered: summary.passesRendered,
        passesNormalised: summary.passesNormalised,
        passesUpserted: summary.passesUpserted,
        warnings: summary.warnings,
      }
    )
  }

  if (
    summary.providerFetches > 0 &&
    summary.cacheHits === 0 &&
    summary.passesUpserted === 0 &&
    summary.warnings.some(
      (warning) => warning.reason === "provider_returned_no_passes"
    )
  ) {
    summary.reason = "provider_returned_no_passes"
    summary.message =
      "No provider windows returned for this subscription. Try radio mode, lower threshold, or extend days ahead."
  } else if (summary.warnings.length > 0) {
    summary.reason = "refresh_completed_with_warnings"
    summary.message = "Pass refresh completed with warnings."
  } else {
    summary.reason = "refresh_completed"
    summary.message = "Pass refresh completed."
  }

  return summary
}
