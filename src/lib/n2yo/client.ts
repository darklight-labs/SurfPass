import "server-only"

import { z } from "zod"

import { EnvValidationError, getN2yoEnv } from "@/lib/env"
import { noradIdSchema } from "@/lib/validation/schemas"
import type { NormalisedSatelliteLookup } from "@/types/domain"
import type {
  N2yoLookupErrorCode,
  N2yoRadioPassRequestInput,
  N2yoRadioPassResponse,
  N2yoTleResponse,
  N2yoVisualPassRequestInput,
  N2yoVisualPassResponse,
} from "@/lib/n2yo/types"

const N2YO_BASE_URL = "https://api.n2yo.com/rest/v1/satellite"
const DEFAULT_TIMEOUT_MS = 12000

const n2yoTleResponseSchema = z.object({
  info: z.object({
    satid: z.number(),
    satname: z.string(),
    transactionscount: z.number().optional(),
  }),
  tle: z.string(),
})

const n2yoInfoSchema = z.object({
  satid: z.number(),
  satname: z.string(),
  transactionscount: z.number().optional(),
  passescount: z.number().optional(),
})

const n2yoVisualPassSchema = z
  .object({
    startAz: z.number().optional(),
    startAzCompass: z.string().optional(),
    startEl: z.number().optional(),
    startUTC: z.number(),
    maxAz: z.number().optional(),
    maxAzCompass: z.string().optional(),
    maxEl: z.number(),
    maxUTC: z.number(),
    endAz: z.number().optional(),
    endAzCompass: z.string().optional(),
    endEl: z.number().optional(),
    endUTC: z.number(),
    mag: z.number().optional(),
    duration: z.number().optional(),
  })
  .passthrough()

const n2yoRadioPassSchema = z
  .object({
    startAz: z.number().optional(),
    startAzCompass: z.string().optional(),
    startUTC: z.number(),
    maxAz: z.number().optional(),
    maxAzCompass: z.string().optional(),
    maxEl: z.number(),
    maxUTC: z.number(),
    endAz: z.number().optional(),
    endAzCompass: z.string().optional(),
    endUTC: z.number(),
  })
  .passthrough()

const n2yoVisualPassResponseSchema = z.object({
  info: n2yoInfoSchema,
  passes: z.array(n2yoVisualPassSchema).optional().default([]),
})

const n2yoRadioPassResponseSchema = z.object({
  info: n2yoInfoSchema,
  passes: z.array(n2yoRadioPassSchema).optional().default([]),
})

export class N2yoLookupError extends Error {
  code: N2yoLookupErrorCode
  providerStatus?: number

  constructor(
    code: N2yoLookupErrorCode,
    message: string,
    providerStatus?: number
  ) {
    super(message)
    this.name = "N2yoLookupError"
    this.code = code
    this.providerStatus = providerStatus
  }
}

function getApiKey() {
  try {
    return getN2yoEnv().n2yoApiKey
  } catch (error) {
    if (error instanceof EnvValidationError) {
      throw new N2yoLookupError("configuration", error.message)
    }

    throw error
  }
}

function buildUrl(path: string) {
  const apiKey = encodeURIComponent(getApiKey())

  return `${N2YO_BASE_URL}${path}&apiKey=${apiKey}`
}

function buildTleUrl(noradId: number) {
  return buildUrl(`/tle/${noradId}`)
}

function buildVisualPassesUrl(input: N2yoVisualPassRequestInput) {
  return buildUrl(
    `/visualpasses/${input.noradId}/${input.latitude}/${input.longitude}/${input.elevationM}/${input.days}/${input.minVisibilitySeconds}`
  )
}

function buildRadioPassesUrl(input: N2yoRadioPassRequestInput) {
  return buildUrl(
    `/radiopasses/${input.noradId}/${input.latitude}/${input.longitude}/${input.elevationM}/${input.days}/${input.minElevation}`
  )
}

function splitTleLines(tle: string) {
  return tle
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export async function getTle(noradId: number): Promise<N2yoTleResponse> {
  const parsedNoradId = noradIdSchema.parse(noradId)
  const payload = await fetchN2yoJson(buildTleUrl(parsedNoradId), "tle")
  const parsed = n2yoTleResponseSchema.safeParse(payload)

  if (!parsed.success) {
    throw new N2yoLookupError(
      "invalid_satellite",
      "N2YO did not return a usable TLE record."
    )
  }

  return parsed.data
}

async function fetchN2yoJson(url: string, endpoint: string) {
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
    throw new N2yoLookupError(
      "provider_unavailable",
      `N2YO ${endpoint} lookup could not be reached.`
    )
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new N2yoLookupError(
      mapStatusToErrorCode(response.status),
      `N2YO ${endpoint} lookup returned HTTP ${response.status}.`,
      response.status
    )
  }

  try {
    return await response.json()
  } catch {
    throw new N2yoLookupError(
      "unexpected_response",
      `N2YO ${endpoint} lookup returned invalid JSON.`
    )
  }
}

function mapStatusToErrorCode(status: number): N2yoLookupErrorCode {
  if (status === 400 || status === 404 || status === 422) {
    return "invalid_satellite"
  }

  if (status === 429) {
    return "rate_limited"
  }

  return "provider_unavailable"
}

function validatePassRequest(input: N2yoVisualPassRequestInput | N2yoRadioPassRequestInput) {
  noradIdSchema.parse(input.noradId)

  if (
    !Number.isFinite(input.latitude) ||
    input.latitude < -90 ||
    input.latitude > 90 ||
    !Number.isFinite(input.longitude) ||
    input.longitude < -180 ||
    input.longitude > 180 ||
    !Number.isFinite(input.elevationM) ||
    !Number.isInteger(input.days) ||
    input.days < 1 ||
    input.days > 10
  ) {
    throw new N2yoLookupError("invalid_request", "N2YO pass request is invalid.")
  }
}

export async function getVisualPasses(
  input: N2yoVisualPassRequestInput
): Promise<N2yoVisualPassResponse> {
  validatePassRequest(input)

  if (
    !Number.isInteger(input.minVisibilitySeconds) ||
    input.minVisibilitySeconds < 0
  ) {
    throw new N2yoLookupError(
      "invalid_request",
      "N2YO visual pass minimum visibility is invalid."
    )
  }

  const payload = await fetchN2yoJson(buildVisualPassesUrl(input), "visualpasses")
  const parsed = n2yoVisualPassResponseSchema.safeParse(payload)

  if (!parsed.success) {
    throw new N2yoLookupError(
      "unexpected_response",
      "N2YO visual passes returned an unexpected response."
    )
  }

  return parsed.data
}

export async function getRadioPasses(
  input: N2yoRadioPassRequestInput
): Promise<N2yoRadioPassResponse> {
  validatePassRequest(input)

  if (!Number.isInteger(input.minElevation) || input.minElevation < 0) {
    throw new N2yoLookupError(
      "invalid_request",
      "N2YO radio pass minimum elevation is invalid."
    )
  }

  const payload = await fetchN2yoJson(buildRadioPassesUrl(input), "radiopasses")
  const parsed = n2yoRadioPassResponseSchema.safeParse(payload)

  if (!parsed.success) {
    throw new N2yoLookupError(
      "unexpected_response",
      "N2YO radio passes returned an unexpected response."
    )
  }

  return parsed.data
}

export async function validateNoradSatellite(
  noradId: number
): Promise<NormalisedSatelliteLookup> {
  const tle = await getTle(noradId)
  const tleLines = splitTleLines(tle.tle)
  const name = tle.info.satname.trim()

  if (
    tle.info.satid !== noradId ||
    !name ||
    tleLines.length < 2 ||
    !tleLines[0].startsWith("1 ") ||
    !tleLines[1].startsWith("2 ")
  ) {
    throw new N2yoLookupError(
      "invalid_satellite",
      "N2YO did not return a valid satellite TLE."
    )
  }

  return {
    noradId: tle.info.satid,
    name,
    tleLine1: tleLines[0],
    tleLine2: tleLines[1],
    source: "n2yo",
  }
}
