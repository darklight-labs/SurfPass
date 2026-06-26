import type { NormalisedPassPrediction, PassScore } from "@/types/domain"

export function scorePass(
  pass: Pick<
    NormalisedPassPrediction,
    "passType" | "maxEl" | "durationSeconds" | "magnitude"
  >
): PassScore {
  const maxElevation = pass.maxEl ?? 0
  const duration = pass.durationSeconds ?? 0

  if (pass.passType === "visual") {
    const magnitude = pass.magnitude
    const brightEnough = magnitude === undefined || magnitude === null || magnitude <= 0

    if (maxElevation >= 60 && duration >= 300 && brightEnough) {
      return "excellent"
    }

    if (maxElevation >= 30 && duration >= 120) {
      return "good"
    }

    return "low"
  }

  if (maxElevation >= 60 && duration >= 300) {
    return "excellent"
  }

  if (maxElevation >= 30) {
    return "good"
  }

  return "low"
}

export function getPassScoreLabel(score: PassScore) {
  const labels: Record<PassScore, string> = {
    excellent: "Excellent",
    good: "Good",
    low: "Low",
  }

  return labels[score]
}

export function getPassScoreExplanation(score: PassScore) {
  const explanations: Record<PassScore, string> = {
    excellent: "High elevation and enough useful time to act.",
    good: "Useful pass window, but not the strongest opportunity.",
    low: "Marginal pass; check only if the group has a specific reason.",
  }

  return explanations[score]
}
