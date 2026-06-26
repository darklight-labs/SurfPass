import type { DaylightLabel } from "@/types/domain"

export type SunEvents = {
  date: string
  sunrise?: string | null
  sunset?: string | null
  civilTwilightBegin?: string | null
  civilTwilightEnd?: string | null
  nauticalTwilightBegin?: string | null
  nauticalTwilightEnd?: string | null
  astronomicalTwilightBegin?: string | null
  astronomicalTwilightEnd?: string | null
}

export type DaylightClassification = {
  label: DaylightLabel
  context: {
    provider: "sunrise-sunset"
    date: string
    basis: "max_utc"
    classifiedAtUtc: string
    events?: SunEvents
  }
}

function parseEventTime(value?: string | null) {
  if (!value) {
    return null
  }

  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function isBetween(value: number, start: number | null, end: number | null) {
  return start !== null && end !== null && value >= start && value <= end
}

function classificationContext(
  label: DaylightLabel,
  atUtc: string,
  events?: SunEvents
): DaylightClassification {
  return {
    label,
    context: {
      provider: "sunrise-sunset",
      date: events?.date ?? getDateForTimeZone(atUtc),
      basis: "max_utc",
      classifiedAtUtc: atUtc,
      ...(events ? { events } : {}),
    },
  }
}

export function getDateForTimeZone(value: string, timeZone?: string | null) {
  const date = new Date(value)

  if (!Number.isFinite(date.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }

  if (!timeZone) {
    return date.toISOString().slice(0, 10)
  }

  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date)
    const year = parts.find((part) => part.type === "year")?.value
    const month = parts.find((part) => part.type === "month")?.value
    const day = parts.find((part) => part.type === "day")?.value

    if (year && month && day) {
      return `${year}-${month}-${day}`
    }
  } catch {
    return date.toISOString().slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

export function classifyLightContext(input: {
  atUtc: string
  events?: SunEvents | null
}): DaylightClassification {
  const at = Date.parse(input.atUtc)

  if (!Number.isFinite(at) || !input.events) {
    return classificationContext("unknown", input.atUtc, input.events ?? undefined)
  }

  const sunrise = parseEventTime(input.events.sunrise)
  const sunset = parseEventTime(input.events.sunset)
  const civilBegin = parseEventTime(input.events.civilTwilightBegin)
  const civilEnd = parseEventTime(input.events.civilTwilightEnd)
  const nauticalBegin = parseEventTime(input.events.nauticalTwilightBegin)
  const nauticalEnd = parseEventTime(input.events.nauticalTwilightEnd)
  const astronomicalBegin = parseEventTime(input.events.astronomicalTwilightBegin)
  const astronomicalEnd = parseEventTime(input.events.astronomicalTwilightEnd)

  if (sunrise === null || sunset === null) {
    return classificationContext("unknown", input.atUtc, input.events)
  }

  if (isBetween(at, sunrise, sunset)) {
    return classificationContext("daylight", input.atUtc, input.events)
  }

  if (
    isBetween(at, civilBegin, sunrise) ||
    isBetween(at, sunset, civilEnd)
  ) {
    return classificationContext("civil_twilight", input.atUtc, input.events)
  }

  if (
    isBetween(at, nauticalBegin, civilBegin) ||
    isBetween(at, civilEnd, nauticalEnd)
  ) {
    return classificationContext("nautical_twilight", input.atUtc, input.events)
  }

  if (
    isBetween(at, astronomicalBegin, nauticalBegin) ||
    isBetween(at, nauticalEnd, astronomicalEnd)
  ) {
    return classificationContext(
      "astronomical_twilight",
      input.atUtc,
      input.events
    )
  }

  return classificationContext("night", input.atUtc, input.events)
}
