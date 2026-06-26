import type {
  GroupDetailViewModel,
  GroupMemberViewModel,
  GroupSubscriptionViewModel,
  GroupSummaryViewModel,
  SatelliteCatalogueItem,
  SavedLocationViewModel,
} from "@/types/domain"

export type GroupsResult = {
  groups: GroupSummaryViewModel[]
  error?: string
}

export type GroupDetailResult = {
  group: GroupDetailViewModel | null
  members: GroupMemberViewModel[]
  subscriptions: GroupSubscriptionViewModel[]
  error?: string
}

export type GroupSubscriptionOptions = {
  locations: SavedLocationViewModel[]
  satellites: SatelliteCatalogueItem[]
  error?: string
}

export type GroupActionState = {
  ok: boolean
  message: string
}

export const initialGroupActionState: GroupActionState = {
  ok: false,
  message: "",
}
