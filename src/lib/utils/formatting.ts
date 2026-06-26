export function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "0 sec"
  }

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)

  if (minutes === 0) {
    return `${seconds} sec`
  }

  if (seconds === 0) {
    return `${minutes} min`
  }

  return `${minutes} min ${seconds} sec`
}

export function formatElevation(degrees: number) {
  if (!Number.isFinite(degrees)) {
    return "Unknown"
  }

  return `${Math.round(degrees)}°`
}

export function formatMagnitude(magnitude?: number | string | null) {
  if (magnitude === undefined || magnitude === null || magnitude === "") {
    return null
  }

  return typeof magnitude === "number" ? magnitude.toFixed(1) : magnitude
}

export function formatCoordinate(value: number) {
  if (!Number.isFinite(value)) {
    return "Unknown"
  }

  return value.toFixed(4)
}

export function formatMeters(value?: number | null) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "0 m"
  }

  return `${Math.round(value)} m`
}

export function azimuthToCompass(degrees?: number | null) {
  if (degrees === undefined || degrees === null || !Number.isFinite(degrees)) {
    return undefined
  }

  const labels = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ]
  const normalised = ((degrees % 360) + 360) % 360
  const index = Math.round(normalised / 22.5) % labels.length

  return labels[index]
}

export function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}
