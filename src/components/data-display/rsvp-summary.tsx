import { Badge } from "@/components/ui/badge"

type RsvpStatus = "going" | "maybe" | "skipping" | null | undefined

type RsvpSummaryProps = {
  goingCount?: number
  maybeCount?: number
  skippingCount?: number
  currentUserRsvp?: RsvpStatus
  className?: string
}

function getCurrentUserLabel(status: RsvpStatus) {
  if (status === "going") return "You’re going"
  if (status === "maybe") return "You’re maybe"
  if (status === "skipping") return "You’re skipping"
  return "No RSVP yet"
}

export function RsvpSummary({
  goingCount = 0,
  maybeCount = 0,
  skippingCount = 0,
  currentUserRsvp = null,
  className,
}: RsvpSummaryProps) {
  const hasReadiness = goingCount > 0 || maybeCount > 0 || skippingCount > 0

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
          {getCurrentUserLabel(currentUserRsvp)}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-700">
        {hasReadiness ? (
          <>
            <span>{goingCount} going</span>
            <span className="text-zinc-300">/</span>
            <span>{maybeCount} maybe</span>
            {skippingCount > 0 ? (
              <>
                <span className="text-zinc-300">/</span>
                <span>{skippingCount} skipping</span>
              </>
            ) : null}
          </>
        ) : (
          <span className="text-zinc-500">
            No one has marked readiness yet.
          </span>
        )}
      </div>
    </div>
  )
}
