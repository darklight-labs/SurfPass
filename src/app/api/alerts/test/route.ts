import { AlertEmailError, sendTestAlertEmail } from "@/lib/alerts/email"
import {
  EnvValidationError,
  getCronSecret,
  getTestAlertEmail,
} from "@/lib/env"

export const dynamic = "force-dynamic"

function errorResponse(
  message: string,
  status: number,
  code: string,
  details?: Record<string, string>
) {
  return Response.json(
    {
      ok: false,
      error: message,
      code,
      ...(details ? { details } : {}),
    },
    { status }
  )
}

function serverErrorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return { name: "UnknownError", message: String(error) }
  }

  return {
    name: error.name,
    message: error.message,
  }
}

export async function POST(request: Request) {
  let cronSecret: string

  try {
    cronSecret = getCronSecret()
  } catch (error) {
    console.error("[SurfPass test alert]", {
      step: "authorization_configuration_failed",
      error: serverErrorDetails(error),
    })

    return errorResponse(
      "Test alert authorization is not configured.",
      503,
      "cron_secret_missing"
    )
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return errorResponse(
      "Unauthorized test alert request.",
      401,
      "unauthorized"
    )
  }

  try {
    const to = getTestAlertEmail()
    const result = await sendTestAlertEmail(to)

    return Response.json({
      ok: true,
      providerMessageId: result.providerMessageId,
      to,
    })
  } catch (error) {
    console.error("[SurfPass test alert]", {
      step: "send_failed",
      error: serverErrorDetails(error),
    })

    if (error instanceof EnvValidationError) {
      return errorResponse(
        "Test alert email is not configured.",
        503,
        "alert_environment_missing"
      )
    }

    if (error instanceof AlertEmailError) {
      return errorResponse(
        "Resend could not send the test alert.",
        502,
        "resend_send_failed",
        { provider: "resend" }
      )
    }

    return errorResponse(
      "Test alert email could not be sent.",
      503,
      "test_alert_failed"
    )
  }
}
