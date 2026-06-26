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

function unixToIso(seconds: number) {
  return new Date(seconds * 1000).toISOString()
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
  return {
    provider: "n2yo",
    pass,
  } as Json
}

function radioRaw(pass: N2yoRadioPass): Json {
  return {
    provider: "n2yo",
    pass,
  } as Json
}

function meaningfulMagnitude(magnitude?: number) {
  if (magnitude === undefined || magnitude === 100000) {
    return undefined
  }

  return magnitude
}

export function normaliseVisualPasses(
  response: N2yoVisualPassResponse,
  context: NormaliseContext
): NormalisedPassPrediction[] {
  return response.passes.map((pass) => {
    const startUtc = unixToIso(pass.startUTC)
    const maxUtc = unixToIso(pass.maxUTC)
    const endUtc = unixToIso(pass.endUTC)
    const magnitude = meaningfulMagnitude(pass.mag)
    const durationSeconds = pass.duration ?? pass.endUTC - pass.startUTC
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
  })
}

export function normaliseRadioPasses(
  response: N2yoRadioPassResponse,
  context: NormaliseContext
): NormalisedPassPrediction[] {
  return response.passes.map((pass) => {
    const startUtc = unixToIso(pass.startUTC)
    const maxUtc = unixToIso(pass.maxUTC)
    const endUtc = unixToIso(pass.endUTC)
    const durationSeconds = pass.endUTC - pass.startUTC
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
  })
}
