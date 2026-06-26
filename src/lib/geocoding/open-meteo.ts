import { z } from "zod"

import { geocodeQuerySchema } from "@/lib/validation/schemas"
import type { GeocodedLocationOption } from "@/types/domain"

const openMeteoResultSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string(),
  country: z.string().nullish(),
  admin1: z.string().nullish(),
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number().nullish(),
  timezone: z.string().nullish(),
})

const openMeteoResponseSchema = z.object({
  results: z.array(openMeteoResultSchema).optional(),
})

export class OpenMeteoGeocodingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "OpenMeteoGeocodingError"
  }
}

function normaliseOptionalString(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function normaliseOpenMeteoResult(
  result: z.infer<typeof openMeteoResultSchema>
): GeocodedLocationOption {
  return {
    providerId: result.id,
    name: result.name.trim(),
    country: normaliseOptionalString(result.country),
    admin1: normaliseOptionalString(result.admin1),
    latitude: result.latitude,
    longitude: result.longitude,
    elevationM: result.elevation ?? undefined,
    timezone: normaliseOptionalString(result.timezone),
  }
}

export async function searchOpenMeteoLocations(
  query: string
): Promise<GeocodedLocationOption[]> {
  const q = geocodeQuerySchema.parse(query)
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search")

  url.searchParams.set("name", q)
  url.searchParams.set("count", "8")
  url.searchParams.set("language", "en")
  url.searchParams.set("format", "json")

  let response: Response

  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    })
  } catch {
    throw new OpenMeteoGeocodingError(
      "Open-Meteo geocoding could not be reached."
    )
  }

  if (!response.ok) {
    throw new OpenMeteoGeocodingError(
      `Open-Meteo geocoding returned HTTP ${response.status}.`
    )
  }

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    throw new OpenMeteoGeocodingError(
      "Open-Meteo geocoding returned invalid JSON."
    )
  }

  const parsed = openMeteoResponseSchema.safeParse(payload)

  if (!parsed.success) {
    throw new OpenMeteoGeocodingError(
      "Open-Meteo geocoding returned an unexpected response."
    )
  }

  return (parsed.data.results ?? []).map(normaliseOpenMeteoResult)
}
