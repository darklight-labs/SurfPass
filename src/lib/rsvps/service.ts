import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { RsvpStatus } from "@/types/domain"

type UpsertRsvpInput = {
  userId: string
  groupId: string
  passPredictionId: string
  status: RsvpStatus
  note?: string | null
}

export type UpsertRsvpResult = {
  ok: boolean
  message: string
  status?: RsvpStatus
}

function errorResult(message: string): UpsertRsvpResult {
  return {
    ok: false,
    message,
  }
}

export async function upsertRsvpForUser({
  userId,
  groupId,
  passPredictionId,
  status,
  note,
}: UpsertRsvpInput): Promise<UpsertRsvpResult> {
  const supabase = await createServerSupabaseClient()
  const { data: membership, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id,user_id,role,created_at")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle()

  if (membershipError) {
    return errorResult("Group membership could not be verified.")
  }

  if (!membership) {
    return errorResult("Only group members can RSVP to this pass.")
  }

  const { data: passPrediction, error: passError } = await supabase
    .from("pass_predictions")
    .select("id,satellite_id,location_id,pass_type")
    .eq("id", passPredictionId)
    .maybeSingle()

  if (passError) {
    return errorResult("Pass prediction could not be verified.")
  }

  if (!passPrediction) {
    return errorResult("Pass prediction is unavailable.")
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("group_subscriptions")
    .select("id")
    .eq("group_id", groupId)
    .eq("satellite_id", passPrediction.satellite_id)
    .eq("location_id", passPrediction.location_id)
    .eq("pass_type", passPrediction.pass_type)
    .maybeSingle()

  if (subscriptionError) {
    return errorResult("Group subscription could not be verified.")
  }

  if (!subscription) {
    return errorResult("This pass is not linked to the selected group.")
  }

  const { error } = await supabase.from("pass_rsvps").upsert(
    {
      group_id: groupId,
      pass_prediction_id: passPredictionId,
      user_id: userId,
      status,
      note: note ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "group_id,pass_prediction_id,user_id" }
  )

  if (error) {
    return errorResult(error.message)
  }

  return {
    ok: true,
    message: "RSVP updated.",
    status,
  }
}
