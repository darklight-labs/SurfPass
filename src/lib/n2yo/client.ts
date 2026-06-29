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
}).passthrough()

const optionalNumber = z.number().nullable().optional().transform((value) => value ?? undefined)
const optionalString = z.string().nullable().optional().transform((value) => value ?? undefined)

const n2yoVisualPassSchema = z
  .object({
    startAz: optionalNumber,
    startAzCompass: optionalString,
    startEl: optionalNumber,
    startUTC: optionalNumber,
    maxAz: optionalNumber,
    maxAzCompass: optionalString,
    maxEl: optionalNumber,
    maxUTC: optionalNumber,
    endAz: optionalNumber,
    endAzCompass: optionalString,
    endEl: optionalNumber,
    endUTC: optionalNumber,
    mag: optionalNumber,
    duration: optionalNumber,
    startVisibility: z.union([z.number(), z.string()]).nullable().optional().transform((value) => value ?? undefined),
    endVisibility: z.union([z.number(), z.string()]).nullable().optional().transform((value) => value ?? undefined),
  })
  .passthrough()

const n2yoRadioPassSchema = z
  .object({
    startAz: optionalNumber,
    startAzCompass: optionalString,
    startUTC: optionalNumber,
    maxAz: optionalNumber,
    maxAzCompass: optionalString,
    maxEl: optionalNumber,
    maxUTC: optionalNumber,
    endAz: optionalNumber,
    endAzCompass: optionalString,
    endUTC: optionalNumber,
  })
  .passthrough()

const n2yoVisualPassResponseSchema = z.object({
  info: n2yoInfoSchema,
  passes: z.array(n2yoVisualPassSchema),
}).passthrough()

const n2yoRadioPassResponseSchema = z.object({
  info: n2yoInfoSchema,
  passes: z.array(n2yoRadioPassSchema),
}).passthrough()

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

function normaliseNoPassPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload
  }

  const record = payload as Record<string, unknown>
  const info = record.info
  const passesCount =
    info && typeof info === "object" && "passescount" in info
      ? (info as { passescount?: unknown }).passescount
      : undefined

  if (record.passes == null && passesCount === 0) {
    return {
      ...record,
      passes: [],
    }
  }

  return payload
}

function topLevelKeys(payload: unknown) {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? Object.keys(payload as Record<string, unknown>).slice(0, 20)
    : []
}

function redactSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveValues)
  }

  if (!value || typeof value !== "object") {
    return value
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      /api.?key|secret|token|authorization/i.test(key)
        ? "[redacted]"
        : redactSensitiveValues(entry),
    ])
  )
}

function safeJsonPreview(payload: unknown) {
  try {
    return JSON.stringify(redactSensitiveValues(payload)).slice(0, 500)
  } catch {
    return "[unserializable JSON]"
  }
}

function providerErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null
  }

  const message = (payload as Record<string, unknown>).error
  return typeof message === "string" && message.trim() ? message.trim() : null
}

function logInvalidPassResponse(endpoint: string, payload: unknown) {
  console.error("[SurfPass N2YO]", {
    endpoint,
    reason: "unexpected_response",
    topLevelKeys: topLevelKeys(payload),
    bodyPreview: safeJsonPreview(payload),
  })
}

function withOriginalPassObjects<
  T extends { passes: Array<Record<string, unknown>> },
>(parsed: T, payload: unknown): T {
  const originalPasses =
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    Array.isArray((payload as Record<string, unknown>).passes)
      ? ((payload as Record<string, unknown>).passes as unknown[])
      : []

  return {
    ...parsed,
    passes: parsed.passes.map((pass, index) => {
      const original = originalPasses[index]

      return {
        ...pass,
        raw:
          original && typeof original === "object" && !Array.isArray(original)
            ? (original as Record<string, unknown>)
            : pass,
      }
    }),
  }
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

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    console.error("[SurfPass N2YO]", {
      endpoint,
      providerStatus: response.status,
      reason: "invalid_json",
    })
    throw new N2yoLookupError(
      "unexpected_response",
      `N2YO ${endpoint} lookup returned invalid JSON.`
    )
  }

  const providerMessage = providerErrorMessage(payload)

  console.info("[SurfPass N2YO]", {
    endpoint,
    providerStatus: response.status,
    ok: response.ok,
    topLevelKeys: topLevelKeys(payload),
  })

  if (providerMessage) {
    console.error("[SurfPass N2YO]", {
      endpoint,
      providerStatus: response.status,
      providerError: providerMessage,
    })
    throw new N2yoLookupError(
      "provider_error",
      providerMessage,
      response.status
    )
  }

  if (!response.ok) {
    throw new N2yoLookupError(
      mapStatusToErrorCode(response.status),
      `N2YO ${endpoint} lookup returned HTTP ${response.status}.`,
      response.status
    )
  }

  return payload
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
  const normalisedPayload = normaliseNoPassPayload(payload)
  const parsed = n2yoVisualPassResponseSchema.safeParse(normalisedPayload)

  if (!parsed.success) {
    logInvalidPassResponse("visualpasses", payload)
    throw new N2yoLookupError(
      "unexpected_response",
      "N2YO visual passes returned an unexpected response."
    )
  }

  return withOriginalPassObjects(parsed.data, normalisedPayload)
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
  const normalisedPayload = normaliseNoPassPayload(payload)
  const parsed = n2yoRadioPassResponseSchema.safeParse(normalisedPayload)

  if (!parsed.success) {
    logInvalidPassResponse("radiopasses", payload)
    throw new N2yoLookupError(
      "unexpected_response",
      "N2YO radio passes returned an unexpected response."
    )
  }

  return withOriginalPassObjects(parsed.data, normalisedPayload)
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
