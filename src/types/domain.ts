import type { Json } from "@/types/database"

export type PassType = "visual" | "radio"
export type PassScore = "excellent" | "good" | "low"
export type RsvpStatus = "going" | "maybe" | "skipping"
export type AlertState = "off" | "scheduled" | "sent" | "skipped" | "failed"
export type DataState = "live" | "cached" | "stale" | "unavailable"
export type DaylightLabel =
  | "daylight"
  | "night"
  | "civil_twilight"
  | "nautical_twilight"
  | "astronomical_twilight"
  | "unknown"

export type NormalisedPassPrediction = {
  id?: string
  satelliteId: string
  locationId: string
  passType: PassType
  source: "n2yo" | string
  startUtc: string
  maxUtc: string
  endUtc: string
  startAz?: number | null
  startAzCompass?: string | null
  startEl?: number | null
  maxAz?: number | null
  maxAzCompass?: string | null
  maxEl?: number | null
  endAz?: number | null
  endAzCompass?: string | null
  endEl?: number | null
  magnitude?: number | null
  durationSeconds?: number | null
  score: PassScore
  daylightLabel?: DaylightLabel | null
  daylightContext?: Json | null
  daylightFetchedAt?: string | null
  raw?: Json | null
  fetchedAt: string
  cacheKey: string
}

export type GroupSubscriptionSummary = {
  id: string
  groupId: string
  groupName: string
  locationId: string
  locationName: string
  satelliteId: string
  satelliteName: string
  noradId: number
  passType: PassType
  minElevation: number
  minVisibilitySeconds: number
  daysAhead: number
  alertsEnabled: boolean
}

export type PassCardViewModel = {
  groupId?: string
  passPredictionId?: string
  satelliteName: string
  passType: PassType
  groupName: string
  localStart: string
  localMax: string
  localEnd: string
  maxElevation: number
  startAzCompass?: string | null
  maxAzCompass?: string | null
  endAzCompass?: string | null
  directionSummary: string
  durationSeconds: number
  magnitude?: number | string | null
  score: PassScore
  daylightLabel?: DaylightLabel | null
  rsvpGoingCount: number
  rsvpMaybeCount: number
  rsvpSkippingCount?: number
  currentUserRsvp?: RsvpStatus | null
  currentUserNote?: string | null
  rsvpSummary?: string
  alertState: AlertState
  dataState: DataState
  fetchedAt?: string
}

export type GeocodedLocationOption = {
  providerId: number | string
  name: string
  country?: string
  admin1?: string
  latitude: number
  longitude: number
  elevationM?: number
  timezone?: string
}

export type SavedLocationViewModel = {
  id: string
  name: string
  label?: string | null
  country?: string | null
  latitude: number
  longitude: number
  elevationM: number
  timezone?: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type NormalisedSatelliteLookup = {
  noradId: number
  name: string
  tleLine1?: string
  tleLine2?: string
  source: "n2yo"
}

export type SatelliteCatalogueItem = {
  id: string
  noradId: number
  name: string
  category?: string | null
  description?: string | null
  isCurated: boolean
}

export type GroupRole = "owner" | "member"

export type GroupSummaryViewModel = {
  id: string
  name: string
  description?: string | null
  ownerId: string
  currentUserRole: GroupRole
  memberCount: number
  subscriptionCount: number
  createdAt: string
}

export type GroupMemberViewModel = {
  userId: string
  displayName: string
  role: GroupRole
  isCurrentUser: boolean
  joinedAt: string
}

export type GroupSubscriptionViewModel = {
  id: string
  groupId: string
  locationId: string
  locationName: string
  satelliteId: string
  satelliteName: string
  noradId: number
  passType: PassType
  minElevation: number
  minVisibilitySeconds: number
  daysAhead: number
  alertsEnabled: boolean
  createdAt: string
}

export type GroupDetailViewModel = {
  id: string
  name: string
  description?: string | null
  ownerId: string
  currentUserRole: GroupRole
  createdAt: string
  memberCount: number
  subscriptionCount: number
}

export type AlertPreferenceViewModel = {
  groupId: string
  groupName: string
  currentUserRole: GroupRole
  emailEnabled: boolean
  leadMinutes: number
  updatedAt?: string | null
  isPersisted: boolean
}
