"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth/guards"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  createGroupSchema,
  createGroupSubscriptionSchema,
} from "@/lib/validation/schemas"
import type { GroupActionState } from "@/lib/groups/types"

function actionError(message: string): GroupActionState {
  return {
    ok: false,
    message,
  }
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

function isDuplicateSubscriptionError(error: { code?: string; message?: string }) {
  return (
    error.code === "23505" ||
    error.message?.toLowerCase().includes("duplicate") ||
    error.message?.toLowerCase().includes("group_subscriptions_group_id")
  )
}

export async function createGroupAction(
  _previousState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  const user = await getCurrentUser()

  if (!user) {
    return actionError("Sign in to create a group.")
  }

  const parsed = createGroupSchema.safeParse({
    name: formString(formData, "name"),
    description: formString(formData, "description"),
  })

  if (!parsed.success) {
    return actionError(
      parsed.error.issues[0]?.message ?? "Group details are invalid."
    )
  }

  const supabase = await createServerSupabaseClient()
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .select("id")
    .single()

  if (groupError) {
    return actionError(groupError.message)
  }

  const { error: memberError } = await supabase.from("group_members").upsert(
    {
      group_id: group.id,
      user_id: user.id,
      role: "owner",
    },
    { onConflict: "group_id,user_id" }
  )

  if (memberError) {
    return actionError(memberError.message)
  }

  await supabase.from("alert_preferences").upsert(
    {
      user_id: user.id,
      group_id: group.id,
      email_enabled: true,
      lead_minutes: 30,
    },
    { onConflict: "user_id,group_id" }
  )

  revalidatePath("/groups")
  revalidatePath("/dashboard")
  redirect(`/groups/${group.id}`)
}

export async function createGroupSubscriptionAction(
  _previousState: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  const user = await getCurrentUser()

  if (!user) {
    return actionError("Sign in to add a group subscription.")
  }

  const parsed = createGroupSubscriptionSchema.safeParse({
    groupId: formString(formData, "groupId"),
    locationId: formString(formData, "locationId"),
    satelliteId: formString(formData, "satelliteId"),
    passType: formString(formData, "passType"),
    minElevation: formData.get("minElevation") ?? 30,
    minVisibilitySeconds: formData.get("minVisibilitySeconds") ?? 120,
    daysAhead: formData.get("daysAhead") ?? 7,
    alertsEnabled: formData.get("alertsEnabled") === "on",
  })

  if (!parsed.success) {
    return actionError(
      parsed.error.issues[0]?.message ?? "Subscription details are invalid."
    )
  }

  const input = parsed.data
  const supabase = await createServerSupabaseClient()
  const { data: membership, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id,user_id,role,created_at")
    .eq("group_id", input.groupId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError) {
    return actionError(membershipError.message)
  }

  if (!membership) {
    return actionError("You must be a group member to add subscriptions.")
  }

  if (membership.role !== "owner") {
    return actionError("Only group owners can add subscriptions in the MVP.")
  }

  const [{ data: location }, { data: satellite }] = await Promise.all([
    supabase
      .from("locations")
      .select("id")
      .eq("id", input.locationId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("satellites")
      .select("id")
      .eq("id", input.satelliteId)
      .maybeSingle(),
  ])

  if (!location) {
    return actionError("Choose one of your saved observer locations.")
  }

  if (!satellite) {
    return actionError("Choose an existing satellite catalogue record.")
  }

  const { error } = await supabase.from("group_subscriptions").insert({
    group_id: input.groupId,
    location_id: input.locationId,
    satellite_id: input.satelliteId,
    pass_type: input.passType,
    min_elevation: input.minElevation,
    min_visibility_seconds: input.minVisibilitySeconds,
    days_ahead: input.daysAhead,
    alerts_enabled: input.alertsEnabled,
  })

  if (error) {
    if (isDuplicateSubscriptionError(error)) {
      return actionError(
        "This group already watches that satellite from that location for this pass type."
      )
    }

    return actionError(error.message)
  }

  revalidatePath(`/groups/${input.groupId}`)
  revalidatePath("/groups")
  revalidatePath("/dashboard")

  return {
    ok: true,
    message: "Group subscription added.",
  }
}
