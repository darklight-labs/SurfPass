import "server-only"

import { getAppBaseUrl } from "@/lib/env"
import { DEFAULT_ALERT_LEAD_MINUTES } from "@/lib/alerts/constants"
import { sendAlertEmail } from "@/lib/alerts/email"
import { derivePassAlertState } from "@/lib/alerts/state"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { formatDuration, formatElevation } from "@/lib/utils/formatting"
import { scorePass } from "@/lib/passes/scoring"
import type { Database, Json } from "@/types/database"
import type {
  AlertEmailPayload,
  ManualAlertSendResult,
} from "@/lib/alerts/types"

type PassPredictionRow = Database["public"]["Tables"]["pass_predictions"]["Row"]
type GroupSubscriptionRow =
  Database["public"]["Tables"]["group_subscriptions"]["Row"]
type RsvpRow = Database["public"]["Tables"]["pass_rsvps"]["Row"]

type ManualAlertInput = {
  userId: string
  userEmail: string
  groupId: string
  passPredictionId: string
  leadMinutes?: number
}

type AlertContext = {
  groupName: string
  satelliteName: string
  timezone?: string | null
  pass: PassPredictionRow
  subscription: GroupSubscriptionRow
  leadMinutes: number
  userEmailEnabled: boolean
  rsvps: RsvpRow[]
}

export class AlertDeliveryError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "alert_delivery_error"
  ) {
    super(message)
    this.name = "AlertDeliveryError"
  }
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

function buildPayload(
  input: ManualAlertInput,
  context: AlertContext
): AlertEmailPayload {
  const durationSeconds = fallbackDurationSeconds(context.pass)

  return {
    to: input.userEmail,
    groupName: context.groupName,
    satelliteName: context.satelliteName,
    passType: context.pass.pass_type,
    localStart: formatLocalDateTime(context.pass.start_utc, context.timezone),
    localMax: formatLocalDateTime(context.pass.max_utc, context.timezone),
    localEnd: formatLocalDateTime(context.pass.end_utc, context.timezone),
    maxElevation: context.pass.max_el ?? undefined,
    directionSummary: directionSummary(context.pass) || undefined,
    durationSeconds,
    magnitude: context.pass.magnitude,
    score:
      context.pass.score ??
      scorePass({
        passType: context.pass.pass_type,
        maxEl: context.pass.max_el,
        durationSeconds,
        magnitude: context.pass.magnitude,
      }),
    rsvpSummary: rsvpSummary(context.rsvps),
    appUrl: `${getAppBaseUrl()}/groups/${input.groupId}`,
  }
}

async function loadAlertContext(input: ManualAlertInput): Promise<AlertContext> {
  const supabase = await createServerSupabaseClient()
  const [
    { data: membership, error: membershipError },
    { data: group, error: groupError },
    { data: pass, error: passError },
  ] = await Promise.all([
    supabase
      .from("group_members")
      .select("group_id,user_id,role,created_at")
      .eq("group_id", input.groupId)
      .eq("user_id", input.userId)
      .maybeSingle(),
    supabase
      .from("groups")
      .select("id,owner_id,name,description,created_at,updated_at")
      .eq("id", input.groupId)
      .maybeSingle(),
    supabase
      .from("pass_predictions")
      .select(
        "id,satellite_id,location_id,pass_type,source,start_utc,max_utc,end_utc,start_az,start_az_compass,start_el,max_az,max_az_compass,max_el,end_az,end_az_compass,end_el,magnitude,duration_seconds,score,daylight_label,daylight_context,daylight_fetched_at,raw,fetched_at,cache_key,created_at"
      )
      .eq("id", input.passPredictionId)
      .maybeSingle(),
  ])

  if (membershipError || groupError || passError) {
    throw new AlertDeliveryError(
      membershipError?.message ??
        groupError?.message ??
        passError?.message ??
        "Alert context could not be loaded.",
      503,
      "alert_context_unavailable"
    )
  }

  if (!membership) {
    throw new AlertDeliveryError(
      "Only group members can send a manual alert for this group.",
      403,
      "not_group_member"
    )
  }

  if (!group) {
    throw new AlertDeliveryError("Group was not found.", 404, "group_not_found")
  }

  if (!pass) {
    throw new AlertDeliveryError(
      "Pass prediction was not found for this user.",
      404,
      "pass_not_found"
    )
  }

  const [
    { data: subscription, error: subscriptionError },
    { data: satellite, error: satelliteError },
    { data: location, error: locationError },
    { data: preference, error: preferenceError },
    { data: rsvps, error: rsvpsError },
  ] = await Promise.all([
    supabase
      .from("group_subscriptions")
      .select(
        "id,group_id,location_id,satellite_id,pass_type,min_elevation,min_visibility_seconds,days_ahead,alerts_enabled,created_at,updated_at"
      )
      .eq("group_id", input.groupId)
      .eq("satellite_id", pass.satellite_id)
      .eq("location_id", pass.location_id)
      .eq("pass_type", pass.pass_type)
      .maybeSingle(),
    supabase
      .from("satellites")
      .select("id,norad_id,name,category,description,is_curated,created_at,updated_at")
      .eq("id", pass.satellite_id)
      .maybeSingle(),
    supabase
      .from("locations")
      .select(
        "id,user_id,name,label,latitude,longitude,elevation_m,timezone,country,is_default,created_at,updated_at"
      )
      .eq("id", pass.location_id)
      .maybeSingle(),
    supabase
      .from("alert_preferences")
      .select("id,user_id,group_id,email_enabled,lead_minutes,created_at,updated_at")
      .eq("user_id", input.userId)
      .eq("group_id", input.groupId)
      .maybeSingle(),
    supabase
      .from("pass_rsvps")
      .select("id,group_id,pass_prediction_id,user_id,status,note,created_at,updated_at")
      .eq("group_id", input.groupId)
      .eq("pass_prediction_id", input.passPredictionId),
  ])

  if (
    subscriptionError ||
    satelliteError ||
    locationError ||
    preferenceError ||
    rsvpsError
  ) {
    throw new AlertDeliveryError(
      subscriptionError?.message ??
        satelliteError?.message ??
        locationError?.message ??
        preferenceError?.message ??
        rsvpsError?.message ??
        "Alert context could not be loaded.",
      503,
      "alert_context_unavailable"
    )
  }

  if (!subscription) {
    throw new AlertDeliveryError(
      "Pass does not belong to a subscription for this group.",
      403,
      "pass_not_in_group_context"
    )
  }

  const leadMinutes =
    input.leadMinutes ??
    preference?.lead_minutes ??
    DEFAULT_ALERT_LEAD_MINUTES

  return {
    groupName: group.name,
    satelliteName: satellite?.name ?? "Satellite",
    timezone: location?.timezone,
    pass,
    subscription,
    leadMinutes,
    userEmailEnabled: preference?.email_enabled ?? true,
    rsvps: rsvps ?? [],
  }
}

async function claimDelivery(
  input: ManualAlertInput,
  leadMinutes: number
) {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from("notification_deliveries")
    .insert({
      user_id: input.userId,
      group_id: input.groupId,
      pass_prediction_id: input.passPredictionId,
      channel: "email",
      lead_minutes: leadMinutes,
      status: "pending",
      sent_at: null,
      metadata: {
        manualTest: true,
        claimedAt: new Date().toISOString(),
      },
    })
    .select(
      "id,user_id,group_id,pass_prediction_id,channel,lead_minutes,status,sent_at,provider_message_id,metadata"
    )
    .single()

  if (!error) {
    return {
      admin,
      delivery: data,
      alreadyClaimed: false,
    }
  }

  if (!isUniqueConstraintError(error)) {
    throw new AlertDeliveryError(
      "Notification delivery could not be claimed.",
      503,
      "delivery_claim_failed"
    )
  }

  const { data: existingDelivery, error: existingError } = await admin
    .from("notification_deliveries")
    .select(
      "id,user_id,group_id,pass_prediction_id,channel,lead_minutes,status,sent_at,provider_message_id,metadata"
    )
    .eq("user_id", input.userId)
    .eq("group_id", input.groupId)
    .eq("pass_prediction_id", input.passPredictionId)
    .eq("channel", "email")
    .eq("lead_minutes", leadMinutes)
    .maybeSingle()

  if (existingError || !existingDelivery) {
    throw new AlertDeliveryError(
      "Notification delivery records could not be checked.",
      503,
      "delivery_check_failed"
    )
  }

  return {
    admin,
    delivery: existingDelivery,
    alreadyClaimed: true,
  }
}

async function releaseDeliveryClaim(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  deliveryId: string
) {
  await admin
    .from("notification_deliveries")
    .delete()
    .eq("id", deliveryId)
    .eq("status", "pending")
}

async function markDeliverySent(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  input: {
    deliveryId: string
    providerMessageId: string
    metadata: Json
  }
) {
  return admin
    .from("notification_deliveries")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      provider_message_id: input.providerMessageId,
      metadata: input.metadata,
    })
    .eq("id", input.deliveryId)
    .eq("status", "pending")
    .select("id,provider_message_id,sent_at")
    .single()
}

export async function sendManualTestAlert(
  input: ManualAlertInput
): Promise<ManualAlertSendResult> {
  const context = await loadAlertContext(input)
  const alertState = derivePassAlertState({
    passType: context.pass.pass_type,
    startUtc: context.pass.start_utc,
    maxElevation: context.pass.max_el,
    durationSeconds: fallbackDurationSeconds(context.pass),
    minElevation: context.subscription.min_elevation,
    minVisibilitySeconds: context.subscription.min_visibility_seconds,
    subscriptionAlertsEnabled: context.subscription.alerts_enabled,
    userEmailEnabled: context.userEmailEnabled,
    deliveryExists: false,
  })

  if (alertState === "off") {
    throw new AlertDeliveryError(
      "Email alerts are disabled for this group.",
      409,
      "alerts_off"
    )
  }

  if (alertState === "skipped") {
    throw new AlertDeliveryError(
      "This pass does not currently qualify for an email alert.",
      422,
      "alert_skipped"
    )
  }

  const { admin, delivery, alreadyClaimed } = await claimDelivery(
    input,
    context.leadMinutes
  )

  if (alreadyClaimed) {
    return {
      status: "deduped",
      message:
        delivery.status === "sent"
          ? "Alert already sent for this pass and lead time."
          : "Alert delivery is already claimed for this pass and lead time.",
      providerMessageId: delivery.provider_message_id,
      sentAt: delivery.sent_at ?? undefined,
    }
  }

  const payload = buildPayload(input, context)
  const idempotencyKey = [
    "surfpass-alert",
    input.userId,
    input.groupId,
    input.passPredictionId,
    context.leadMinutes,
  ].join(":")
  const metadata: Json = {
    manualTest: true,
    recipientEmail: input.userEmail,
    satelliteName: context.satelliteName,
    groupName: context.groupName,
    passType: context.pass.pass_type,
    startUtc: context.pass.start_utc,
    maxElevation:
      context.pass.max_el === null
        ? null
        : formatElevation(context.pass.max_el),
    duration: formatDuration(fallbackDurationSeconds(context.pass)),
  }

  let result

  try {
    result = await sendAlertEmail({
      payload,
      leadMinutes: context.leadMinutes,
      idempotencyKey,
    })
  } catch (error) {
    await releaseDeliveryClaim(admin, delivery.id)
    throw error
  }

  const { data: sentDelivery, error } = await markDeliverySent(admin, {
    deliveryId: delivery.id,
    providerMessageId: result.providerMessageId,
    metadata,
  })

  if (error) {
    if (isUniqueConstraintError(error)) {
      return {
        status: "deduped",
        message: "Alert already sent for this pass and lead time.",
        providerMessageId: result.providerMessageId,
      }
    }

    throw new AlertDeliveryError(
      "Email was accepted by Resend, but the delivery record could not be written.",
      503,
      "delivery_record_failed"
    )
  }

  return {
    status: "sent",
    message: "Manual alert email sent.",
    providerMessageId: result.providerMessageId,
    deliveryId: sentDelivery?.id,
  }
}
