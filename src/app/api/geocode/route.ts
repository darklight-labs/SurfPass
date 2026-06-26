import type { NextRequest } from "next/server"

import {
  OpenMeteoGeocodingError,
  searchOpenMeteoLocations,
} from "@/lib/geocoding/open-meteo"
import { geocodeSearchParamsSchema } from "@/lib/validation/schemas"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const parsed = geocodeSearchParamsSchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
  })

  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid geocoding query.",
      },
      { status: 400 }
    )
  }

  try {
    const results = await searchOpenMeteoLocations(parsed.data.q)

    return Response.json({
      results,
    })
  } catch (error) {
    const message =
      error instanceof OpenMeteoGeocodingError
        ? "Open-Meteo geocoding is unavailable right now."
        : "Geocoding failed."

    return Response.json({ error: message }, { status: 502 })
  }
}
