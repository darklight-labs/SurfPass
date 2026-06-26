import { revalidatePath } from "next/cache"
import type { NextRequest } from "next/server"

import { PassRefreshError, refreshPassesForGroup } from "@/lib/passes/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { uuidSchema } from "@/lib/validation/schemas"

export const dynamic = "force-dynamic"

type RefreshRouteReason =
  | "not_authenticated"
  | "not_group_member"
  | "no_subscriptions"
  | "missing_n2yo_api_key"
  | "missing_supabase_service_role_key"
  | "subscription_load_failed"
  | "provider_error"
  | "provider_invalid_response"
  | "provider_returned_no_passes"
  | "normalisation_failed"
  | "cache_write_failed"
  | "api_fetch_log_failed"
  | "unknown_refresh_error"

function safeErrorDetails(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== "object") {
    return { message: String(error) }
  }

  const record = error as Record<string, unknown>

  return {
    name: record.name,
    code: record.code,
    message: record.message,
    details: record.details,
    hint: record.hint,
    status: record.status,
  }
}

function logRefreshFailure(
  reason: RefreshRouteReason,
  message: string,
  details?: Record<string, unknown>
) {
  console.error("[SurfPass refresh]", { reason, message, details })
}

function numberDetail(details: Record<string, unknown> | undefined, key: string) {
  const value = details?.[key]
  return typeof value === "number" ? value : undefined
}

function warningDetails(details: Record<string, unknown> | undefined) {
  const value = details?.warnings
  return Array.isArray(value)
    ? value.filter(
        (warning): warning is Record<string, unknown> =>
          warning !== null && typeof warning === "object"
      )
    : []
}

function jsonFailure(
  reason: RefreshRouteReason,
  message: string,
  status: number,
  details?: Record<string, unknown>
) {
  logRefreshFailure(reason, message, details)

  return Response.json(
    {
      ok: false,
      reason,
      message,
      details,
      subscriptionsChecked: numberDetail(details, "subscriptionsChecked"),
      providerFetches: numberDetail(details, "providerFetches"),
      cacheHits: numberDetail(details, "cacheHits"),
      passesNormalised: numberDetail(details, "passesNormalised"),
      passesUpserted: numberDetail(details, "passesUpserted"),
      warnings: warningDetails(details),
    },
    { status }
  )
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const parsedGroupId = uuidSchema.safeParse(id)

  if (!parsedGroupId.success) {
    return jsonFailure("unknown_refresh_error", "Group id is invalid.", 400, {
      groupId: id,
      validation: "uuid",
    })
  }

  console.info("[SurfPass refresh]", {
    step: "start",
    groupId: parsedGroupId.data,
  })

  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>

  try {
    supabase = await createServerSupabaseClient()
  } catch (error) {
    return jsonFailure(
      "unknown_refresh_error",
      "Supabase server client could not be created for pass refresh.",
      503,
      safeErrorDetails(error)
    )
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return jsonFailure(
      "not_authenticated",
      "Sign in to refresh group passes.",
      401,
      userError ? safeErrorDetails(userError) : undefined
    )
  }

  const { data: membership, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id,user_id,role,created_at")
    .eq("group_id", parsedGroupId.data)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError) {
    return jsonFailure(
      "not_group_member",
      "Group membership could not be verified.",
      503,
      safeErrorDetails(membershipError)
    )
  }

  if (!membership) {
    return jsonFailure(
      "not_group_member",
      "Only group members can refresh pass data.",
      403,
      { groupId: parsedGroupId.data, userId: user.id }
    )
  }

  try {
    const summary = await refreshPassesForGroup(parsedGroupId.data)

    revalidatePath(`/groups/${parsedGroupId.data}`)
    revalidatePath("/dashboard")

    return Response.json(summary)
  } catch (error) {
    if (error instanceof PassRefreshError) {
      return jsonFailure(
        error.reason,
        error.message,
        error.status,
        error.details
      )
    }

    return jsonFailure(
      "unknown_refresh_error",
      "Pass refresh failed unexpectedly. Check server diagnostics for the exact failure step.",
      503,
      safeErrorDetails(error)
    )
  }
}
