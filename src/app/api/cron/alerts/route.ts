import { EnvValidationError, getCronSecret } from "@/lib/env"
import { runScheduledAlertWorker } from "@/lib/alerts/scheduler"

export const dynamic = "force-dynamic"

function errorResponse(message: string, status: number, code: string) {
  return Response.json(
    {
      ok: false,
      error: message,
      code,
    },
    { status }
  )
}

export async function GET(request: Request) {
  let cronSecret: string

  try {
    cronSecret = getCronSecret()
  } catch (error) {
    return errorResponse(
      error instanceof Error
        ? error.message
        : "Cron alert route is not configured.",
      500,
      "cron_secret_missing"
    )
  }

  const authorization = request.headers.get("authorization")

  if (authorization !== `Bearer ${cronSecret}`) {
    return errorResponse("Unauthorized cron request.", 401, "unauthorized")
  }

  try {
    const summary = await runScheduledAlertWorker()

    return Response.json(summary)
  } catch (error) {
    return errorResponse(
      error instanceof Error
        ? error.message
        : "Scheduled alert worker failed.",
      500,
      error instanceof EnvValidationError
        ? "alert_environment_missing"
        : "scheduled_alert_worker_failed"
    )
  }
}
