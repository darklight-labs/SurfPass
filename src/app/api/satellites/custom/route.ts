import type { NextRequest } from "next/server"

import { getCurrentUser } from "@/lib/auth/guards"
import { EnvValidationError } from "@/lib/env"
import { N2yoLookupError, validateNoradSatellite } from "@/lib/n2yo/client"
import { mapSatelliteRow } from "@/lib/satellites/queries"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { customSatelliteLookupSchema } from "@/lib/validation/schemas"

export const dynamic = "force-dynamic"

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

function n2yoErrorResponse(error: N2yoLookupError) {
  if (error.code === "configuration") {
    return jsonError(
      "N2YO_API_KEY is not configured, so custom NORAD lookup is unavailable.",
      503
    )
  }

  if (error.code === "invalid_satellite") {
    return jsonError(
      "N2YO did not return a valid satellite for that NORAD ID.",
      error.providerStatus === 404 ? 404 : 422
    )
  }

  return jsonError(
    "N2YO TLE lookup is unavailable right now. Try again later.",
    503
  )
}

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonError("Request body must be valid JSON.", 400)
  }

  const parsed = customSatelliteLookupSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "NORAD ID is invalid.",
      400
    )
  }

  const user = await getCurrentUser()

  if (!user) {
    return jsonError("Sign in to add a custom satellite.", 401)
  }

  const { noradId } = parsed.data
  const supabase = await createServerSupabaseClient()
  const { data: existing, error: existingError } = await supabase
    .from("satellites")
    .select("id,norad_id,name,category,description,is_curated,created_at,updated_at")
    .eq("norad_id", noradId)
    .maybeSingle()

  if (existingError) {
    return jsonError("Satellite catalogue is unavailable right now.", 503)
  }

  if (existing) {
    return Response.json({
      satellite: mapSatelliteRow(existing),
      status: "existing",
    })
  }

  let lookup

  try {
    lookup = await validateNoradSatellite(noradId)
  } catch (error) {
    if (error instanceof N2yoLookupError) {
      return n2yoErrorResponse(error)
    }

    throw error
  }

  try {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from("satellites")
      .upsert(
        {
          norad_id: lookup.noradId,
          name: lookup.name,
          category: "custom",
          description: "Validated through N2YO TLE lookup.",
          is_curated: false,
        },
        { onConflict: "norad_id" }
      )
      .select("id,norad_id,name,category,description,is_curated,created_at,updated_at")
      .single()

    if (error) {
      return jsonError("Satellite could not be saved.", 503)
    }

    return Response.json({
      satellite: mapSatelliteRow(data),
      status: "created",
    })
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return jsonError(
        "Supabase service role is not configured, so custom satellites cannot be saved.",
        503
      )
    }

    throw error
  }
}
