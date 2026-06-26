export function formatTimeRange(start: string, end: string) {
  return `${start} - ${end}`
}

export function formatFetchedAt(fetchedAt?: string | Date) {
  if (!fetchedAt) {
    return "No provider fetch recorded"
  }

  if (typeof fetchedAt === "string") {
    return fetchedAt
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(fetchedAt)
}

export function formatLocalPassTime(value: string | Date, timeZone?: string | null) {
  const date = typeof value === "string" ? new Date(value) : value

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timeZone ?? undefined,
  }).format(date)
}
