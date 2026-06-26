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

export type RefreshPassesSummary = {
  groupId: string
  subscriptionsChecked: number
  providerFetches: number
  cacheHits: number
  passesUpserted: number
  warnings: string[]
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
    groupId,
    subscriptionsChecked: 0,
    providerFetches: 0,
    cacheHits: 0,
    passesUpserted: 0,
    warnings: [],
  }
}

export function isCacheFresh(fetchedAt: string | Date, freshnessHours = 6) {
  const fetched = typeof fetchedAt === "string" ? new Date(fetchedAt) : fetchedAt
  const ageMs = Date.now() - fetched.getTime()

  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= freshnessHours * 60 * 60 * 1000
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
    .gte("end_utc", new Date().toISOString())
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

  const { error } = await client
    .from("pass_predictions")
    .upsert(rows, { onConflict: "cache_key" })

  if (error) {
    throw error
  }

  return rows.length
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
  await client.from("api_fetch_logs").insert({
    provider: input.provider,
    endpoint: input.endpoint,
    status: input.status,
    status_code: input.statusCode ?? null,
    message: input.message ?? null,
    metadata: input.metadata ?? null,
  })
}

function providerWarning(subscription: RefreshableSubscription, error: unknown) {
  if (error instanceof N2yoLookupError) {
    if (error.code === "configuration") {
      return "N2YO_API_KEY is not configured, so live pass refresh is unavailable."
    }

    if (error.code === "rate_limited") {
      return `N2YO rate-limited ${subscription.satellite.name}; cached data is being reused where available.`
    }

    return `N2YO could not refresh ${subscription.satellite.name}: ${error.message}`
  }

  return `N2YO could not refresh ${subscription.satellite.name}.`
}

function endpointForPassType(passType: PassType) {
  return passType === "visual" ? "visualpasses" : "radiopasses"
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
): Promise<Omit<RefreshPassesSummary, "groupId" | "subscriptionsChecked">> {
  const summary = {
    providerFetches: 0,
    cacheHits: 0,
    passesUpserted: 0,
    warnings: [] as string[],
  }
  const cached = await getCachedPassesForSubscription(client, subscription)
  const latestCached = cached[0]

  if (latestCached && isCacheFresh(latestCached.fetched_at)) {
    summary.cacheHits += 1
    return summary
  }

  summary.providerFetches += 1

  try {
    const fetchedAt = new Date()
    const passes =
      subscription.passType === "visual"
        ? normaliseVisualPasses(
            await getVisualPasses({
              noradId: subscription.satellite.noradId,
              latitude: subscription.location.latitude,
              longitude: subscription.location.longitude,
              elevationM: subscription.location.elevationM,
              days: subscription.daysAhead,
              minVisibilitySeconds: subscription.minVisibilitySeconds,
            }),
            {
              satelliteId: subscription.satellite.id,
              locationId: subscription.location.id,
            }
          )
        : normaliseRadioPasses(
            await getRadioPasses({
              noradId: subscription.satellite.noradId,
              latitude: subscription.location.latitude,
              longitude: subscription.location.longitude,
              elevationM: subscription.location.elevationM,
              days: subscription.daysAhead,
              minElevation: subscription.minElevation,
            }),
            {
              satelliteId: subscription.satellite.id,
              locationId: subscription.location.id,
            }
          )

    const daylight = await enrichPassesWithDaylight(
      passes,
      subscription,
      daylightCache,
      fetchedAt
    )

    if (daylight.failures.length > 0) {
      summary.warnings.push(
        "Sunrise-Sunset daylight enrichment was unavailable for some passes; light context is marked unknown."
      )
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

    const passesUpserted = await upsertPassPredictions(
      client,
      daylight.passes,
      fetchedAt
    )
    summary.passesUpserted += passesUpserted

    if (passesUpserted === 0) {
      summary.warnings.push(
        `N2YO returned no ${subscription.passType} passes for ${subscription.satellite.name}.`
      )
    }

    await logProviderFetch(client, {
      provider: "n2yo",
      endpoint: endpointForPassType(subscription.passType),
      status: "success",
      message: `${passesUpserted} passes normalised.`,
      metadata: {
        groupId: subscription.groupId,
        subscriptionId: subscription.id,
        satelliteId: subscription.satellite.id,
        locationId: subscription.location.id,
        passType: subscription.passType,
      },
    })
  } catch (error) {
    const warning = providerWarning(subscription, error)
    summary.warnings.push(warning)

    if (cached.length > 0) {
      summary.warnings.push(
        `Showing stale cached pass data for ${subscription.satellite.name}.`
      )
    }

    await logProviderFetch(client, {
      provider: "n2yo",
      endpoint: endpointForPassType(subscription.passType),
      status: "error",
      statusCode: error instanceof N2yoLookupError ? error.providerStatus : undefined,
      message: warning,
      metadata: {
        groupId: subscription.groupId,
        subscriptionId: subscription.id,
        satelliteId: subscription.satellite.id,
        locationId: subscription.location.id,
        passType: subscription.passType,
      },
    })
  }

  return summary
}

function mapRefreshableSubscriptions(
  subscriptions: GroupSubscriptionRow[],
  locations: Map<string, LocationRow>,
  satellites: Map<string, SatelliteRow>
) {
  const result: {
    subscriptions: RefreshableSubscription[]
    warnings: string[]
  } = {
    subscriptions: [],
    warnings: [],
  }

  subscriptions.forEach((subscription) => {
    const location = locations.get(subscription.location_id)
    const satellite = satellites.get(subscription.satellite_id)

    if (!location || !satellite) {
      result.warnings.push(
        `Subscription ${subscription.id} is missing its location or satellite record.`
      )
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
  const client = createAdminSupabaseClient()
  const summary = emptySummary(groupId)
  const { data: subscriptions, error } = await client
    .from("group_subscriptions")
    .select(
      "id,group_id,location_id,satellite_id,pass_type,min_elevation,min_visibility_seconds,days_ahead,alerts_enabled,created_at,updated_at"
    )
    .eq("group_id", groupId)

  if (error) {
    throw error
  }

  if (!subscriptions || subscriptions.length === 0) {
    return summary
  }

  const locationIds = [...new Set(subscriptions.map((row) => row.location_id))]
  const satelliteIds = [...new Set(subscriptions.map((row) => row.satellite_id))]
  const [{ data: locations }, { data: satellites }] = await Promise.all([
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
  const mapped = mapRefreshableSubscriptions(
    subscriptions,
    new Map((locations ?? []).map((location) => [location.id, location])),
    new Map((satellites ?? []).map((satellite) => [satellite.id, satellite]))
  )
  const daylightCache: DaylightLookupCache = new Map()

  summary.warnings.push(...mapped.warnings)
  summary.subscriptionsChecked = mapped.subscriptions.length

  for (const subscription of mapped.subscriptions) {
    const result = await refreshPassesForSubscription(
      client,
      subscription,
      daylightCache
    )
    summary.providerFetches += result.providerFetches
    summary.cacheHits += result.cacheHits
    summary.passesUpserted += result.passesUpserted
    summary.warnings.push(...result.warnings)
  }

  return summary
}
