import { Badge } from "@/components/ui/badge"
import { scoreStates } from "@/styles/design-tokens"
import { cn } from "@/lib/utils"
import type { PassScore } from "@/types/domain"

export type { PassScore }

type PassScoreBadgeProps = {
  score: PassScore
  className?: string
}

const scoreLabel: Record<PassScore, string> = {
  excellent: "Excellent",
  good: "Good",
  low: "Low",
}

export function PassScoreBadge({ score, className }: PassScoreBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-md border px-2.5 text-xs font-semibold",
        scoreStates[score],
        className
      )}
    >
      {scoreLabel[score]}
    </Badge>
  )
}
