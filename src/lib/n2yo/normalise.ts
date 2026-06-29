import { scorePass } from "@/lib/passes/scoring"
import { azimuthToCompass } from "@/lib/utils/formatting"
import type { Json } from "@/types/database"
import type {
  N2yoRadioPass,
  N2yoRadioPassResponse,
  N2yoVisualPass,
  N2yoVisualPassResponse,
} from "@/lib/n2yo/types"
import type { NormalisedPassPrediction, PassType } from "@/types/domain"

type NormaliseContext = {
  satelliteId: string
  locationId: string
}

const MILLISECOND_TIMESTAMP_FLOOR = 100_000_000_000

function unixSecondsToIso(value: number, field: string) {
  if (!Number.isFinite(value) || Math.abs(value) >= MILLISECOND_TIMESTAMP_FLOOR) {
    throw new Error(`${field} must be a Unix timestamp in seconds.`)
  }

  const date = new Date(value * 1000)

  if (!Number.isFinite(date.getTime())) {
    throw new Error(`${field} is outside the supported date range.`)
  }

  return date.toISOString()
}

function normaliseCompass(value?: string, degrees?: number) {
  const trimmed = value?.trim()
  return trimmed || azimuthToCompass(degrees)
}

export function buildPassCacheKey({
  satelliteId,
  locationId,
  passType,
  startUtc,
}: {
  satelliteId: string
  locationId: string
  passType: PassType
  startUtc: string
}) {
  return `${satelliteId}:${locationId}:${passType}:${startUtc}`
}

function visualRaw(pass: N2yoVisualPass): Json {
  if (pass.raw) {
    return pass.raw as Json
  }

  const original = { ...pass }
  delete original.raw
  return original as Json
}

function radioRaw(pass: N2yoRadioPass): Json {
  if (pass.raw) {
    return pass.raw as Json
  }

  const original = { ...pass }
  delete original.raw
  return original as Json
}

function meaningfulMagnitude(magnitude?: number) {
  if (magnitude === undefined || magnitude === 100000) {
    return undefined
  }

  return magnitude
}

function passTimes(pass: {
  startUTC?: number
  maxUTC?: number
  endUTC?: number
}) {
  if (
    pass.startUTC === undefined ||
    pass.maxUTC === undefined ||
    pass.endUTC === undefined
  ) {
    throw new Error("N2YO pass timestamps are incomplete.")
  }

  if (pass.startUTC > pass.maxUTC || pass.maxUTC > pass.endUTC) {
    throw new Error("N2YO pass timestamps are out of order.")
  }

  return {
    startUtc: unixSecondsToIso(pass.startUTC, "startUTC"),
    maxUtc: unixSecondsToIso(pass.maxUTC, "maxUTC"),
    endUtc: unixSecondsToIso(pass.endUTC, "endUTC"),
  }
}

function normalisePassList<T, R>(
  passes: T[],
  normalise: (pass: T) => R,
  passType: PassType
) {
  const result: R[] = []
  let invalidCount = 0

  passes.forEach((pass) => {
    try {
      result.push(normalise(pass))
    } catch {
      invalidCount += 1
    }
  })

  if (passes.length > 0 && result.length === 0) {
    throw new Error(`N2YO returned no usable ${passType} pass records.`)
  }

  if (invalidCount > 0) {
    console.warn("[SurfPass N2YO]", {
      step: "normalisation_skipped_records",
      passType,
      invalidCount,
      validCount: result.length,
    })
  }

  return result
}

export function normaliseVisualPasses(
  response: N2yoVisualPassResponse,
  context: NormaliseContext
): NormalisedPassPrediction[] {
  return normalisePassList(response.passes, (pass) => {
    const { startUtc, maxUtc, endUtc } = passTimes(pass)
    const magnitude = meaningfulMagnitude(pass.mag)
    const durationSeconds =
      pass.duration !== undefined &&
      Number.isFinite(pass.duration) &&
      pass.duration >= 0
        ? pass.duration
        : undefined
    const partial = {
      satelliteId: context.satelliteId,
      locationId: context.locationId,
      passType: "visual" as const,
      source: "n2yo",
      startUtc,
      maxUtc,
      endUtc,
      startAz: pass.startAz,
      startAzCompass: normaliseCompass(pass.startAzCompass, pass.startAz),
      startEl: pass.startEl,
      maxAz: pass.maxAz,
      maxAzCompass: normaliseCompass(pass.maxAzCompass, pass.maxAz),
      maxEl: pass.maxEl,
      endAz: pass.endAz,
      endAzCompass: normaliseCompass(pass.endAzCompass, pass.endAz),
      endEl: pass.endEl,
      magnitude,
      durationSeconds,
      raw: visualRaw(pass),
      fetchedAt: new Date().toISOString(),
      cacheKey: buildPassCacheKey({
        satelliteId: context.satelliteId,
        locationId: context.locationId,
        passType: "visual",
        startUtc,
      }),
    }

    return {
      ...partial,
      score: scorePass(partial),
    }
  }, "visual")
}

export function normaliseRadioPasses(
  response: N2yoRadioPassResponse,
  context: NormaliseContext
): NormalisedPassPrediction[] {
  return normalisePassList(response.passes, (pass) => {
    const { startUtc, maxUtc, endUtc } = passTimes(pass)
    const durationSeconds =
      pass.startUTC !== undefined && pass.endUTC !== undefined
        ? pass.endUTC - pass.startUTC
        : undefined
    const partial = {
      satelliteId: context.satelliteId,
      locationId: context.locationId,
      passType: "radio" as const,
      source: "n2yo",
      startUtc,
      maxUtc,
      endUtc,
      startAz: pass.startAz,
      startAzCompass: normaliseCompass(pass.startAzCompass, pass.startAz),
      maxAz: pass.maxAz,
      maxAzCompass: normaliseCompass(pass.maxAzCompass, pass.maxAz),
      maxEl: pass.maxEl,
      endAz: pass.endAz,
      endAzCompass: normaliseCompass(pass.endAzCompass, pass.endAz),
      durationSeconds,
      raw: radioRaw(pass),
      fetchedAt: new Date().toISOString(),
      cacheKey: buildPassCacheKey({
        satelliteId: context.satelliteId,
        locationId: context.locationId,
        passType: "radio",
        startUtc,
      }),
    }

    return {
      ...partial,
      score: scorePass(partial),
    }
  }, "radio")
}
