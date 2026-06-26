import type { RsvpStatus } from "@/types/domain"

export type RsvpActionState = {
  ok: boolean
  message: string | null
  status?: RsvpStatus
  updatedAt?: number
}

export const initialRsvpActionState: RsvpActionState = {
  ok: false,
  message: null,
}
