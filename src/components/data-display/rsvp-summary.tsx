import { Badge } from "@/components/ui/badge"
import type { RsvpStatus } from "@/types/domain"

type RsvpSummaryProps = {
  goingCount: number
  maybeCount: number
  skippingCount: number
  totalRsvpCount: number
  currentUserRsvpStatus: RsvpStatus | null
  className?: string
}

function getCurrentUserPill(status: RsvpStatus | null) {
  if (status === "going") return "You: Going"
  if (status === "maybe") return "You: Maybe"
  if (status === "skipping") return "You: Skipping"
  return "No RSVP yet"
}

function getCurrentUserCopy(status: RsvpStatus | null) {
  if (status === "going") return "You’re going."
  if (status === "maybe") return "You’re maybe."
  if (status === "skipping") return "You’re skipping this pass."
  return "No RSVP yet."
}

export function RsvpSummary({
  goingCount,
  maybeCount,
  skippingCount,
  totalRsvpCount,
  currentUserRsvpStatus,
  className,
}: RsvpSummaryProps) {
  const summary = [
    goingCount > 0 ? `${goingCount} going` : null,
    maybeCount > 0 ? `${maybeCount} maybe` : null,
    skippingCount > 0 ? `${skippingCount} skipping` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Group readiness
        </p>

        <Badge
          variant="outline"
          className="h-6 rounded-md border-zinc-300 bg-white px-2 text-xs text-zinc-700"
        >
          {getCurrentUserPill(currentUserRsvpStatus)}
        </Badge>
      </div>

      <p className="text-sm font-medium text-zinc-800">
        {getCurrentUserCopy(currentUserRsvpStatus)}
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        {totalRsvpCount > 0
          ? summary
          : "No one has marked readiness yet."}
      </p>
    </div>
  )
}
