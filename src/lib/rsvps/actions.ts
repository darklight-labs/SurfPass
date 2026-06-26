"use server"

import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/auth/guards"
import { upsertRsvpForUser } from "@/lib/rsvps/service"
import type { RsvpActionState } from "@/lib/rsvps/types"
import { rsvpSchema } from "@/lib/validation/schemas"

function formString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

function actionResult(state: RsvpActionState): RsvpActionState {
  return {
    ...state,
    updatedAt: Date.now(),
  }
}

export async function upsertRsvpAction(
  _previousState: RsvpActionState,
  formData: FormData
): Promise<RsvpActionState> {
  const user = await getCurrentUser()

  if (!user) {
    return actionResult({
      ok: false,
      message: "Sign in to RSVP.",
    })
  }

  const parsed = rsvpSchema.safeParse({
    groupId: formString(formData, "groupId"),
    passPredictionId: formString(formData, "passPredictionId"),
    status: formString(formData, "status"),
    note: formString(formData, "note"),
  })

  if (!parsed.success) {
    return actionResult({
      ok: false,
      message: parsed.error.issues[0]?.message ?? "RSVP details are invalid.",
    })
  }

  const result = await upsertRsvpForUser({
    userId: user.id,
    groupId: parsed.data.groupId,
    passPredictionId: parsed.data.passPredictionId,
    status: parsed.data.status,
    note: parsed.data.note,
  })

  if (result.ok) {
    revalidatePath(`/groups/${parsed.data.groupId}`)
    revalidatePath("/dashboard")
  }

  return actionResult({
    ok: result.ok,
    message: result.message,
    status: result.status,
  })
}
