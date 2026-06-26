import "server-only"

import { z } from "zod"

import type { SunEvents } from "@/lib/daylight/classify"

const SUNRISE_SUNSET_URL = "https://api.sunrise-sunset.org/json"
const DEFAULT_TIMEOUT_MS = 8000

const sunEventsSchema = z.object({
  sunrise: z.string().nullish(),
  sunset: z.string().nullish(),
  civil_twilight_begin: z.string().nullish(),
  civil_twilight_end: z.string().nullish(),
  nautical_twilight_begin: z.string().nullish(),
  nautical_twilight_end: z.string().nullish(),
  astronomical_twilight_begin: z.string().nullish(),
  astronomical_twilight_end: z.string().nullish(),
})

const sunriseSunsetResponseSchema = z.object({
  results: sunEventsSchema,
  status: z.string(),
})

export class SunriseSunsetError extends Error {
  constructor(
    message: string,
    public providerStatus?: number
  ) {
    super(message)
    this.name = "SunriseSunsetError"
  }
}

function validateInput(input: {
  latitude: number
  longitude: number
  date: string
}) {
  if (
    !Number.isFinite(input.latitude) ||
    input.latitude < -90 ||
    input.latitude > 90 ||
    !Number.isFinite(input.longitude) ||
    input.longitude < -180 ||
    input.longitude > 180 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date)
  ) {
    throw new SunriseSunsetError("Sunrise-Sunset request is invalid.")
  }
}

function normaliseSunEvents(
  date: string,
  results: z.infer<typeof sunEventsSchema>
): SunEvents {
  return {
    date,
    sunrise: results.sunrise ?? null,
    sunset: results.sunset ?? null,
    civilTwilightBegin: results.civil_twilight_begin ?? null,
    civilTwilightEnd: results.civil_twilight_end ?? null,
    nauticalTwilightBegin: results.nautical_twilight_begin ?? null,
    nauticalTwilightEnd: results.nautical_twilight_end ?? null,
    astronomicalTwilightBegin: results.astronomical_twilight_begin ?? null,
    astronomicalTwilightEnd: results.astronomical_twilight_end ?? null,
  }
}

export async function getSunEvents(input: {
  latitude: number
  longitude: number
  date: string
  timezone?: string | null
}): Promise<SunEvents> {
  validateInput(input)

  const url = new URL(SUNRISE_SUNSET_URL)
  url.searchParams.set("lat", String(input.latitude))
  url.searchParams.set("lng", String(input.longitude))
  url.searchParams.set("date", input.date)
  url.searchParams.set("formatted", "0")

  const timezone = input.timezone?.trim()

  if (timezone) {
    url.searchParams.set("tzid", timezone)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  let response: Response

  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    })
  } catch {
    throw new SunriseSunsetError("Sunrise-Sunset could not be reached.")
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new SunriseSunsetError(
      `Sunrise-Sunset returned HTTP ${response.status}.`,
      response.status
    )
  }

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    throw new SunriseSunsetError("Sunrise-Sunset returned invalid JSON.")
  }

  const parsed = sunriseSunsetResponseSchema.safeParse(payload)

  if (!parsed.success || parsed.data.status !== "OK") {
    throw new SunriseSunsetError(
      "Sunrise-Sunset returned an unexpected response."
    )
  }

  return normaliseSunEvents(input.date, parsed.data.results)
}
