import { Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { RsvpStatus } from "@/types/domain"

export type RsvpState = RsvpStatus

type RsvpSummaryProps = {
  goingCount: number
  maybeCount: number
  currentUserRsvp?: RsvpState
  className?: string
}

const currentLabel: Record<RsvpState, string> = {
  going: "You're going",
  maybe: "Maybe",
  skipping: "Skipping",
}

export function RsvpSummary({
  goingCount,
  maybeCount,
  currentUserRsvp,
  className,
}: RsvpSummaryProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 text-sm text-zinc-700",
        className
      )}
      aria-label={`${goingCount} going, ${maybeCount} maybe`}
    >
      <Users className="size-4 text-zinc-500" />
      {goingCount === 0 && maybeCount === 0 ? (
        <span className="font-medium text-zinc-950">
          No one has marked readiness yet.
        </span>
      ) : (
        <>
          <span className="font-medium text-zinc-950">{goingCount} going</span>
          <span className="text-zinc-400">/</span>
          <span>{maybeCount} maybe</span>
        </>
      )}
      {currentUserRsvp ? (
        <Badge
          variant="outline"
          className="h-6 rounded-md border-zinc-300 bg-white px-2 text-xs text-zinc-700"
        >
          {currentLabel[currentUserRsvp]}
        </Badge>
      ) : null}
    </div>
  )
}
