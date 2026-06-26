import "server-only"

import { EnvValidationError, getAppBaseUrl } from "@/lib/env"
import { sendAlertDigestEmail } from "@/lib/alerts/email"
import { derivePassAlertState } from "@/lib/alerts/state"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { formatDuration, formatElevation } from "@/lib/utils/formatting"
import { scorePass } from "@/lib/passes/scoring"
import type {
  AlertDigestEmailPayload,
  AlertDigestPass,
} from "@/lib/alerts/types"
import type { Database, Json } from "@/types/database"

const ALERT_WINDOW_TOLERANCE_MINUTES = 7

type AdminClient = ReturnType<typeof createAdminSupabaseClient>
type AlertPreferenceRow =
  Database["public"]["Tables"]["alert_preferences"]["Row"]
type GroupSubscriptionRow =
  Database["public"]["Tables"]["group_subscriptions"]["Row"]
type PassPredictionRow = Database["public"]["Tables"]["pass_predictions"]["Row"]
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]
type GroupRow = Database["public"]["Tables"]["groups"]["Row"]
type LocationRow = Database["public"]["Tables"]["locations"]["Row"]
type SatelliteRow = Database["public"]["Tables"]["satellites"]["Row"]
type RsvpRow = Database["public"]["Tables"]["pass_rsvps"]["Row"]

type AlertCandidate = {
  preference: AlertPreferenceRow
  subscription: GroupSubscriptionRow
  pass: PassPredictionRow
  profile: ProfileRow
  group: GroupRow
  satellite: SatelliteRow
  location?: LocationRow
  rsvps: RsvpRow[]
}

export type AlertSchedulerSummary = {
  ok: true
  checkedAt: string
  passesConsidered: number
  deliveriesAttempted: number
  deliveriesSent: number
  deliveriesDeduped: number
  deliveriesFailed: number
  digestsAttempted: number
  digestsSent: number
  passesIncluded: number
  deliveriesInserted: number
  warnings: string[]
}

type ClaimedDigestCandidate = {
  candidate: AlertCandidate
  deliveryId: string
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

function isUniqueConstraintError(error: { code?: string; message?: string }) {
  return (
    error.code === "23505" ||
    error.message?.toLowerCase().includes("duplicate") ||
    error.message?.toLowerCase().includes("notification_deliveries")
  )
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

function directionSummary(row: PassPredictionRow) {
  return [row.start_az_compass, row.max_az_compass, row.end_az_compass]
    .filter(Boolean)
    .join(" -> ")
}

function formatLocalDateTime(value: string, timeZone?: string | null) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timeZone ?? undefined,
  }).format(new Date(value))
}

function rsvpSummary(rows: RsvpRow[]) {
  const counts = rows.reduce(
    (acc, row) => {
      acc[row.status] += 1
      return acc
    },
    {
      going: 0,
      maybe: 0,
      skipping: 0,
    }
  )
  const parts = [
    counts.going > 0 ? `${counts.going} going` : null,
    counts.maybe > 0 ? `${counts.maybe} maybe` : null,
    counts.skipping > 0 ? `${counts.skipping} skipping` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(", ") : "No RSVPs yet"
}

function subscriptionKey(row: GroupSubscriptionRow) {
  return `${row.satellite_id}:${row.location_id}:${row.pass_type}`
}

function passKey(row: PassPredictionRow) {
  return `${row.satellite_id}:${row.location_id}:${row.pass_type}`
}

function digestDeliveryKey(input: {
  userId: string
  groupId: string
  leadMinutes: number
  passPredictionIds: string[]
}) {
  return [
    "surfpass-digest",
    input.userId,
    input.groupId,
    input.leadMinutes,
    ...input.passPredictionIds.sort(),
  ].join(":")
}

function isWithinLeadWindow(
  pass: PassPredictionRow,
  preference: AlertPreferenceRow,
  checkedAt: Date
) {
  const startMs = new Date(pass.start_utc).getTime()
  const leadMs = preference.lead_minutes * 60 * 1000
  const toleranceMs = ALERT_WINDOW_TOLERANCE_MINUTES * 60 * 1000
  const windowStart = checkedAt.getTime() + leadMs - toleranceMs
  const windowEnd = checkedAt.getTime() + leadMs + toleranceMs

  return startMs >= windowStart && startMs <= windowEnd
}

function buildDigestPass(candidate: AlertCandidate): AlertDigestPass {
  const durationSeconds = fallbackDurationSeconds(candidate.pass)

  return {
    satelliteName: candidate.satellite.name,
    passType: candidate.pass.pass_type,
    localStart: formatLocalDateTime(
      candidate.pass.start_utc,
      candidate.location?.timezone
    ),
    localMax: formatLocalDateTime(
      candidate.pass.max_utc,
      candidate.location?.timezone
    ),
    localEnd: formatLocalDateTime(
      candidate.pass.end_utc,
      candidate.location?.timezone
    ),
    maxElevation: candidate.pass.max_el ?? undefined,
    directionSummary: directionSummary(candidate.pass) || undefined,
    durationSeconds,
    magnitude: candidate.pass.magnitude,
    score:
      candidate.pass.score ??
      scorePass({
        passType: candidate.pass.pass_type,
        maxEl: candidate.pass.max_el,
        durationSeconds,
        magnitude: candidate.pass.magnitude,
      }),
    rsvpSummary: rsvpSummary(candidate.rsvps),
  }
}

function buildDigestPayload(
  candidates: AlertCandidate[]
): AlertDigestEmailPayload {
  const first = candidates[0]

  return {
    to: first.profile.email,
    groupName: first.group.name,
    leadMinutes: first.preference.lead_minutes,
    passes: candidates.map(buildDigestPass),
    appUrl: `${getAppBaseUrl()}/groups/${first.group.id}`,
  }
}

function emptySummary(checkedAt: Date): AlertSchedulerSummary {
  return {
    ok: true,
    checkedAt: checkedAt.toISOString(),
    passesConsidered: 0,
    deliveriesAttempted: 0,
    deliveriesSent: 0,
    deliveriesDeduped: 0,
    deliveriesFailed: 0,
    digestsAttempted: 0,
    digestsSent: 0,
    passesIncluded: 0,
    deliveriesInserted: 0,
    warnings: [],
  }
}

async function fetchRows<T>(
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  message: string
) {
  const { data, error } = await query

  if (error) {
    throw new Error(`${message}: ${error.message}`)
  }

  return data ?? []
}

async function claimDelivery(
  admin: AdminClient,
  candidate: AlertCandidate
) {
  const { data, error } = await admin
    .from("notification_deliveries")
    .insert({
      user_id: candidate.preference.user_id,
      group_id: candidate.preference.group_id,
      pass_prediction_id: candidate.pass.id,
      channel: "email",
      lead_minutes: candidate.preference.lead_minutes,
      status: "pending",
      sent_at: null,
      metadata: {
        scheduledCron: true,
        claimedAt: new Date().toISOString(),
      },
    })
    .select(
      "id,user_id,group_id,pass_prediction_id,channel,lead_minutes,status,sent_at,provider_message_id,metadata"
    )
    .single()

  if (!error) {
    return {
      delivery: data,
      alreadyClaimed: false,
    }
  }

  if (!isUniqueConstraintError(error)) {
    throw new Error(error.message)
  }

  const { data: existingDelivery, error: existingError } = await admin
    .from("notification_deliveries")
    .select(
      "id,user_id,group_id,pass_prediction_id,channel,lead_minutes,status,sent_at,provider_message_id,metadata"
    )
    .eq("user_id", candidate.preference.user_id)
    .eq("group_id", candidate.preference.group_id)
    .eq("pass_prediction_id", candidate.pass.id)
    .eq("channel", "email")
    .eq("lead_minutes", candidate.preference.lead_minutes)
    .maybeSingle()

  if (existingError || !existingDelivery) {
    throw new Error(
      existingError?.message ?? "Notification delivery record could not be checked."
    )
  }

  return {
    delivery: existingDelivery,
    alreadyClaimed: true,
  }
}

async function releaseDeliveryClaim(
  admin: AdminClient,
  deliveryId: string
) {
  await admin
    .from("notification_deliveries")
    .delete()
    .eq("id", deliveryId)
    .eq("status", "pending")
}

async function markDeliverySent(
  admin: AdminClient,
  candidate: AlertCandidate,
  input: {
    deliveryId: string
    providerMessageId: string
  }
) {
  const metadata: Json = {
    scheduledCron: true,
    recipientEmail: candidate.profile.email,
    satelliteName: candidate.satellite.name,
    groupName: candidate.group.name,
    passType: candidate.pass.pass_type,
    startUtc: candidate.pass.start_utc,
    maxElevation:
      candidate.pass.max_el === null
        ? null
        : formatElevation(candidate.pass.max_el),
    duration: formatDuration(fallbackDurationSeconds(candidate.pass)),
  }

  return admin
    .from("notification_deliveries")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      provider_message_id: input.providerMessageId,
      metadata,
    })
    .eq("id", input.deliveryId)
    .eq("status", "pending")
    .select("id")
    .single()
}

async function logSchedulerRun(
  admin: AdminClient,
  summary: AlertSchedulerSummary,
  status: "success" | "error",
  message?: string
) {
  await admin.from("api_fetch_logs").insert({
    provider: "resend",
    endpoint: "cron_alerts",
    status,
    message:
      message ??
      `${summary.digestsSent} digests sent, ${summary.deliveriesInserted} deliveries inserted, ${summary.deliveriesDeduped} deduped, ${summary.deliveriesFailed} failed.`,
    metadata: summary as unknown as Json,
  })
}

async function loadCandidates(
  admin: AdminClient,
  checkedAt: Date,
  summary: AlertSchedulerSummary
) {
  const preferences = await fetchRows(
    admin
      .from("alert_preferences")
      .select(
        "id,user_id,group_id,email_enabled,lead_minutes,created_at,updated_at"
      )
      .eq("email_enabled", true),
    "Alert preferences could not be loaded"
  )

  if (preferences.length === 0) {
    return [] as AlertCandidate[]
  }

  const validPreferences = preferences.filter((preference) => {
    const valid = preference.lead_minutes > 0 && preference.lead_minutes <= 1440

    if (!valid) {
      summary.warnings.push(
        `Skipping alert preference ${preference.id}; lead time is out of range.`
      )
    }

    return valid
  })

  if (validPreferences.length === 0) {
    return [] as AlertCandidate[]
  }

  const groupIds = unique(validPreferences.map((preference) => preference.group_id))
  const userIds = unique(validPreferences.map((preference) => preference.user_id))
  const minLead = Math.min(...validPreferences.map((preference) => preference.lead_minutes))
  const maxLead = Math.max(...validPreferences.map((preference) => preference.lead_minutes))
  const broadStart = new Date(
    checkedAt.getTime() +
      (minLead - ALERT_WINDOW_TOLERANCE_MINUTES) * 60 * 1000
  )
  const broadEnd = new Date(
    checkedAt.getTime() +
      (maxLead + ALERT_WINDOW_TOLERANCE_MINUTES) * 60 * 1000
  )

  const [
    profiles,
    groups,
    memberships,
    subscriptions,
  ] = await Promise.all([
    fetchRows(
      admin
        .from("profiles")
        .select("id,email,full_name,created_at,updated_at")
        .in("id", userIds),
      "Profiles could not be loaded"
    ),
    fetchRows(
      admin
        .from("groups")
        .select("id,owner_id,name,description,created_at,updated_at")
        .in("id", groupIds),
      "Groups could not be loaded"
    ),
    fetchRows(
      admin
        .from("group_members")
        .select("group_id,user_id,role,created_at")
        .in("group_id", groupIds)
        .in("user_id", userIds),
      "Group memberships could not be loaded"
    ),
    fetchRows(
      admin
        .from("group_subscriptions")
        .select(
          "id,group_id,location_id,satellite_id,pass_type,min_elevation,min_visibility_seconds,days_ahead,alerts_enabled,created_at,updated_at"
        )
        .eq("alerts_enabled", true)
        .in("group_id", groupIds),
      "Group subscriptions could not be loaded"
    ),
  ])

  if (subscriptions.length === 0) {
    return [] as AlertCandidate[]
  }

  const passes = await fetchRows(
    admin
      .from("pass_predictions")
      .select(
        "id,satellite_id,location_id,pass_type,source,start_utc,max_utc,end_utc,start_az,start_az_compass,start_el,max_az,max_az_compass,max_el,end_az,end_az_compass,end_el,magnitude,duration_seconds,score,daylight_label,daylight_context,daylight_fetched_at,raw,fetched_at,cache_key,created_at"
      )
      .gte("start_utc", broadStart.toISOString())
      .lte("start_utc", broadEnd.toISOString())
      .order("start_utc", { ascending: true }),
    "Pass predictions could not be loaded"
  )

  if (passes.length === 0) {
    return [] as AlertCandidate[]
  }

  const satelliteIds = unique(passes.map((pass) => pass.satellite_id))
  const locationIds = unique(passes.map((pass) => pass.location_id))
  const passIds = unique(passes.map((pass) => pass.id))
  const [satellites, locations, rsvps] = await Promise.all([
    fetchRows(
      admin
        .from("satellites")
        .select("id,norad_id,name,category,description,is_curated,created_at,updated_at")
        .in("id", satelliteIds),
      "Satellites could not be loaded"
    ),
    fetchRows(
      admin
        .from("locations")
        .select(
          "id,user_id,name,label,latitude,longitude,elevation_m,timezone,country,is_default,created_at,updated_at"
        )
        .in("id", locationIds),
      "Locations could not be loaded"
    ),
    fetchRows(
      admin
        .from("pass_rsvps")
        .select(
          "id,group_id,pass_prediction_id,user_id,status,note,created_at,updated_at"
        )
        .in("group_id", groupIds)
        .in("pass_prediction_id", passIds),
      "Pass RSVPs could not be loaded"
    ),
  ])
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
  const groupMap = new Map(groups.map((group) => [group.id, group]))
  const satelliteMap = new Map(
    satellites.map((satellite) => [satellite.id, satellite])
  )
  const locationMap = new Map(
    locations.map((location) => [location.id, location])
  )
  const membershipSet = new Set(
    memberships.map((membership) => `${membership.group_id}:${membership.user_id}`)
  )
  const subscriptionsByGroup = new Map<string, GroupSubscriptionRow[]>()

  subscriptions.forEach((subscription) => {
    const current = subscriptionsByGroup.get(subscription.group_id) ?? []
    current.push(subscription)
    subscriptionsByGroup.set(subscription.group_id, current)
  })

  const passesByKey = new Map<string, PassPredictionRow[]>()

  passes.forEach((pass) => {
    const current = passesByKey.get(passKey(pass)) ?? []
    current.push(pass)
    passesByKey.set(passKey(pass), current)
  })

  const rsvpsByPassAndGroup = new Map<string, RsvpRow[]>()

  rsvps.forEach((rsvp) => {
    const key = `${rsvp.group_id}:${rsvp.pass_prediction_id}`
    const current = rsvpsByPassAndGroup.get(key) ?? []
    current.push(rsvp)
    rsvpsByPassAndGroup.set(key, current)
  })

  const candidates: AlertCandidate[] = []

  validPreferences.forEach((preference) => {
    const profile = profileMap.get(preference.user_id)
    const group = groupMap.get(preference.group_id)

    if (!profile?.email) {
      summary.warnings.push(
        `Skipping user ${preference.user_id}; profile email is missing.`
      )
      return
    }

    if (!group) {
      summary.warnings.push(`Skipping group ${preference.group_id}; group is missing.`)
      return
    }

    if (!membershipSet.has(`${preference.group_id}:${preference.user_id}`)) {
      summary.warnings.push(
        `Skipping user ${preference.user_id}; they are no longer a member of group ${preference.group_id}.`
      )
      return
    }

    const groupSubscriptions = subscriptionsByGroup.get(preference.group_id) ?? []

    groupSubscriptions.forEach((subscription) => {
      const matchingPasses = passesByKey.get(subscriptionKey(subscription)) ?? []

      matchingPasses.forEach((pass) => {
        if (!isWithinLeadWindow(pass, preference, checkedAt)) {
          return
        }

        summary.passesConsidered += 1

        const alertState = derivePassAlertState({
          passType: pass.pass_type,
          startUtc: pass.start_utc,
          maxElevation: pass.max_el,
          durationSeconds: fallbackDurationSeconds(pass),
          minElevation: subscription.min_elevation,
          minVisibilitySeconds: subscription.min_visibility_seconds,
          subscriptionAlertsEnabled: subscription.alerts_enabled,
          userEmailEnabled: preference.email_enabled,
          deliveryExists: false,
        })

        if (alertState !== "scheduled") {
          return
        }

        const satellite = satelliteMap.get(pass.satellite_id)

        if (!satellite) {
          summary.warnings.push(
            `Skipping pass ${pass.id}; satellite ${pass.satellite_id} is missing.`
          )
          return
        }

        candidates.push({
          preference,
          subscription,
          pass,
          profile,
          group,
          satellite,
          location: locationMap.get(pass.location_id),
          rsvps:
            rsvpsByPassAndGroup.get(`${preference.group_id}:${pass.id}`) ?? [],
        })
      })
    })
  })

  return candidates
}

function digestGroupKey(candidate: AlertCandidate) {
  return [
    candidate.preference.user_id,
    candidate.preference.group_id,
    "email",
    candidate.preference.lead_minutes,
  ].join(":")
}

function groupDigestCandidates(candidates: AlertCandidate[]) {
  const groups = new Map<string, AlertCandidate[]>()

  candidates.forEach((candidate) => {
    const key = digestGroupKey(candidate)
    const current = groups.get(key) ?? []
    current.push(candidate)
    groups.set(key, current)
  })

  return [...groups.values()].map((group) =>
    group.sort(
      (a, b) =>
        new Date(a.pass.start_utc).getTime() -
        new Date(b.pass.start_utc).getTime()
    )
  )
}

async function claimDigestCandidates(
  admin: AdminClient,
  candidates: AlertCandidate[],
  summary: AlertSchedulerSummary
) {
  const claimed: ClaimedDigestCandidate[] = []

  for (const candidate of candidates) {
    summary.deliveriesAttempted += 1

    try {
      const { delivery, alreadyClaimed } = await claimDelivery(admin, candidate)

      if (alreadyClaimed) {
        summary.deliveriesDeduped += 1
        continue
      }

      claimed.push({
        candidate,
        deliveryId: delivery.id,
      })
    } catch (error) {
      if (error instanceof EnvValidationError) {
        throw error
      }

      summary.deliveriesFailed += 1
      summary.warnings.push(
        error instanceof Error
          ? `Alert delivery claim failed for pass ${candidate.pass.id}: ${error.message}`
          : `Alert delivery claim failed for pass ${candidate.pass.id}.`
      )
    }
  }

  return claimed
}

async function releaseDigestClaims(
  admin: AdminClient,
  claimed: ClaimedDigestCandidate[]
) {
  await Promise.all(
    claimed.map((claim) => releaseDeliveryClaim(admin, claim.deliveryId))
  )
}

async function markDigestSent(
  admin: AdminClient,
  claimed: ClaimedDigestCandidate[],
  providerMessageId: string,
  summary: AlertSchedulerSummary
) {
  for (const claim of claimed) {
    const { error } = await markDeliverySent(admin, claim.candidate, {
      deliveryId: claim.deliveryId,
      providerMessageId,
    })

    if (error) {
      if (isUniqueConstraintError(error)) {
        summary.deliveriesDeduped += 1
        continue
      }

      summary.deliveriesFailed += 1
      summary.warnings.push(
        `Digest email accepted for pass ${claim.candidate.pass.id}, but delivery record failed: ${error.message}`
      )
      continue
    }

    summary.deliveriesSent += 1
    summary.deliveriesInserted += 1
  }
}

async function deliverDigest(
  admin: AdminClient,
  candidates: AlertCandidate[],
  summary: AlertSchedulerSummary
) {
  summary.digestsAttempted += 1

  const claimed = await claimDigestCandidates(admin, candidates, summary)

  if (claimed.length === 0) {
    return
  }

  summary.passesIncluded += claimed.length

  try {
    const result = await sendAlertDigestEmail({
      payload: buildDigestPayload(claimed.map((claim) => claim.candidate)),
      idempotencyKey: digestDeliveryKey({
        userId: claimed[0].candidate.preference.user_id,
        groupId: claimed[0].candidate.preference.group_id,
        leadMinutes: claimed[0].candidate.preference.lead_minutes,
        passPredictionIds: claimed.map((claim) => claim.candidate.pass.id),
      }),
    })

    summary.digestsSent += 1

    await markDigestSent(admin, claimed, result.providerMessageId, summary)
  } catch (error) {
    if (error instanceof EnvValidationError) {
      throw error
    }

    await releaseDigestClaims(admin, claimed)
    summary.deliveriesFailed += claimed.length
    summary.warnings.push(
      error instanceof Error
        ? `Alert digest delivery failed for group ${claimed[0].candidate.group.id}: ${error.message}`
        : `Alert digest delivery failed for group ${claimed[0].candidate.group.id}.`
    )
  }
}

export async function runScheduledAlertWorker(now = new Date()) {
  const admin = createAdminSupabaseClient()
  const summary = emptySummary(now)

  try {
    const candidates = await loadCandidates(admin, now, summary)

    for (const digestCandidates of groupDigestCandidates(candidates)) {
      await deliverDigest(admin, digestCandidates, summary)
    }

    await logSchedulerRun(admin, summary, "success")

    return summary
  } catch (error) {
    summary.warnings.push(
      error instanceof Error ? error.message : "Scheduled alert worker failed."
    )

    try {
      await logSchedulerRun(
        admin,
        summary,
        "error",
        summary.warnings.at(-1)
      )
    } catch {
      // Logging should never hide the primary scheduler failure.
    }

    throw error
  }
}
