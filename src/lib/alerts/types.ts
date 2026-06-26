import type { PassScore, PassType } from "@/types/domain"

export type AlertEmailPayload = {
  to: string
  groupName: string
  satelliteName: string
  passType: PassType
  localStart: string
  localMax: string
  localEnd: string
  maxElevation?: number
  directionSummary?: string
  durationSeconds?: number
  magnitude?: number | null
  score?: PassScore
  rsvpSummary: string
  appUrl: string
}

export type AlertDigestPass = Omit<
  AlertEmailPayload,
  "to" | "groupName" | "appUrl"
>

export type AlertDigestEmailPayload = {
  to: string
  groupName: string
  leadMinutes: number
  passes: AlertDigestPass[]
  appUrl: string
}

export type AlertEmailSendInput = {
  payload: AlertEmailPayload
  leadMinutes: number
  idempotencyKey?: string
}

export type AlertDigestEmailSendInput = {
  payload: AlertDigestEmailPayload
  idempotencyKey?: string
}

export type AlertEmailSendResult = {
  providerMessageId: string
}

export type ManualAlertSendResult =
  | {
      status: "sent"
      message: string
      providerMessageId: string
      deliveryId?: string
    }
  | {
      status: "deduped"
      message: string
      providerMessageId?: string | null
      sentAt?: string
    }
