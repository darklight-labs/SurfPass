"use server"

import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/auth/guards"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { updateAlertPreferenceSchema } from "@/lib/validation/schemas"

export type AlertPreferenceActionState = {
  ok: boolean
  message: string
}

export const initialAlertPreferenceActionState: AlertPreferenceActionState = {
  ok: false,
  message: "",
}

function actionError(message: string): AlertPreferenceActionState {
  return {
    ok: false,
    message,
  }
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

export async function updateAlertPreferenceAction(
  _previousState: AlertPreferenceActionState,
  formData: FormData
): Promise<AlertPreferenceActionState> {
  const user = await getCurrentUser()

  if (!user) {
    return actionError("Sign in to update alert preferences.")
  }

  const parsed = updateAlertPreferenceSchema.safeParse({
    groupId: formString(formData, "groupId"),
    emailEnabled: formString(formData, "emailEnabled") === "true",
    leadMinutes: formData.get("leadMinutes") ?? 30,
  })

  if (!parsed.success) {
    return actionError(
      parsed.error.issues[0]?.message ?? "Alert preference details are invalid."
    )
  }

  const supabase = await createServerSupabaseClient()
  const { data: membership, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id,user_id,role,created_at")
    .eq("group_id", parsed.data.groupId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError) {
    return actionError(membershipError.message)
  }

  if (!membership) {
    return actionError("Join the group before changing its alert settings.")
  }

  const { error } = await supabase.from("alert_preferences").upsert(
    {
      user_id: user.id,
      group_id: parsed.data.groupId,
      email_enabled: parsed.data.emailEnabled,
      lead_minutes: parsed.data.leadMinutes,
    },
    { onConflict: "user_id,group_id" }
  )

  if (error) {
    return actionError(error.message)
  }

  revalidatePath("/settings")
  revalidatePath("/dashboard")
  revalidatePath(`/groups/${parsed.data.groupId}`)

  return {
    ok: true,
    message: "Alert preference updated.",
  }
}
