import { Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { RsvpStatus } from "@/types/domain"

export type RsvpState = RsvpStatus

type RsvpSummaryProps = {
  goingCount: number
  maybeCount: number
  skippingCount?: number
  currentUserRsvp?: RsvpState | null
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
  skippingCount = 0,
  currentUserRsvp,
  className,
}: RsvpSummaryProps) {
  const hasReadiness = goingCount > 0 || maybeCount > 0 || skippingCount > 0

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 text-sm text-zinc-700",
        className
      )}
      aria-label={`${goingCount} going, ${maybeCount} maybe, ${skippingCount} skipping`}
    >
      <Users className="size-4 text-zinc-500" />
      <span className="font-medium text-zinc-950">{goingCount} going</span>
      <span className="text-zinc-400">/</span>
      <span>{maybeCount} maybe</span>
      {skippingCount > 0 ? (
        <>
          <span className="text-zinc-400">/</span>
          <span>{skippingCount} skipping</span>
        </>
      ) : null}
      {!hasReadiness ? (
        <span className="font-medium text-zinc-950">
          No one has marked readiness yet.
        </span>
      ) : null}
      <Badge
        variant="outline"
        className="h-6 rounded-md border-zinc-300 bg-white px-2 text-xs text-zinc-700"
      >
        {currentUserRsvp ? currentLabel[currentUserRsvp] : "No RSVP yet"}
      </Badge>
    </div>
  )
}
