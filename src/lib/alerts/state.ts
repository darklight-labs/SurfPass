import type { AlertState, PassType } from "@/types/domain"

export type PassAlertStateInput = {
  passType: PassType
  startUtc: string
  maxElevation?: number | null
  durationSeconds?: number | null
  minElevation?: number | null
  minVisibilitySeconds?: number | null
  subscriptionAlertsEnabled?: boolean | null
  userEmailEnabled?: boolean | null
  deliveryExists?: boolean
}

function isFuturePass(startUtc: string) {
  const start = new Date(startUtc).getTime()
  return Number.isFinite(start) && start > Date.now()
}

function meetsSubscriptionThreshold(input: PassAlertStateInput) {
  if (input.passType === "visual") {
    const durationSeconds = input.durationSeconds ?? 0
    const minVisibilitySeconds = input.minVisibilitySeconds ?? 0

    return durationSeconds >= minVisibilitySeconds
  }

  const maxElevation = input.maxElevation ?? 0
  const minElevation = input.minElevation ?? 0

  return maxElevation >= minElevation
}

export function derivePassAlertState(input: PassAlertStateInput): AlertState {
  if (input.userEmailEnabled === false) {
    return "off"
  }

  if (input.subscriptionAlertsEnabled === false) {
    return "skipped"
  }

  if (!meetsSubscriptionThreshold(input) || !isFuturePass(input.startUtc)) {
    return "skipped"
  }

  if (input.deliveryExists) {
    return "sent"
  }

  return "scheduled"
}
