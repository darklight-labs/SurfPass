import { revalidatePath } from "next/cache"
import type { NextRequest } from "next/server"

import { AlertDeliveryError, sendManualTestAlert } from "@/lib/alerts/deliveries"
import { AlertEmailError } from "@/lib/alerts/email"
import { getCurrentUser } from "@/lib/auth/guards"
import { EnvValidationError } from "@/lib/env"
import { manualAlertTestSchema } from "@/lib/validation/schemas"

export const dynamic = "force-dynamic"

function jsonError(message: string, status: number, code?: string) {
  return Response.json({ error: message, code }, { status })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return jsonError("Sign in to send a manual alert.", 401, "unauthorized")
  }

  if (!user.email) {
    return jsonError(
      "The signed-in user does not have an email address.",
      422,
      "missing_user_email"
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonError("Request body must be valid JSON.", 400, "invalid_json")
  }

  const parsed = manualAlertTestSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Manual alert request is invalid.",
      400,
      "invalid_request"
    )
  }

  try {
    const result = await sendManualTestAlert({
      userId: user.id,
      userEmail: user.email,
      groupId: parsed.data.groupId,
      passPredictionId: parsed.data.passPredictionId,
      leadMinutes: parsed.data.leadMinutes,
    })

    revalidatePath(`/groups/${parsed.data.groupId}`)
    revalidatePath("/dashboard")

    return Response.json(result)
  } catch (error) {
    if (error instanceof AlertDeliveryError) {
      return jsonError(error.message, error.status, error.code)
    }

    if (error instanceof AlertEmailError) {
      return jsonError(error.message, 503, "resend_send_failed")
    }

    if (error instanceof EnvValidationError) {
      return jsonError(error.message, 503, "env_not_configured")
    }

    return jsonError("Manual alert send failed.", 503, "manual_alert_failed")
  }
}
