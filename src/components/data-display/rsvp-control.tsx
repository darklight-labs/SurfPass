"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { RsvpSummary } from "@/components/data-display/rsvp-summary"
import { upsertRsvpAction } from "@/lib/rsvps/actions"
import { initialRsvpActionState } from "@/lib/rsvps/types"
import { cn } from "@/lib/utils"
import type { RsvpStatus } from "@/types/domain"

type RsvpControlProps = {
  groupId: string
  passPredictionId: string
  currentUserRsvpStatus: RsvpStatus | null
  goingCount: number
  maybeCount: number
  skippingCount: number
  totalRsvpCount: number
  currentUserNote?: string | null
  className?: string
}

type RsvpCounts = {
  goingCount: number
  maybeCount: number
  skippingCount: number
  totalRsvpCount: number
}

type OptimisticSnapshot = {
  status: RsvpStatus | null
  counts: RsvpCounts
}

const options: Array<{ status: RsvpStatus; label: string }> = [
  { status: "going", label: "Going" },
  { status: "maybe", label: "Maybe" },
  { status: "skipping", label: "Skipping" },
]

const activeClass: Record<RsvpStatus, string> = {
  going:
    "border-emerald-800 bg-zinc-950 text-white shadow-sm hover:bg-zinc-800 hover:text-white",
  maybe:
    "border-amber-500 bg-zinc-100 text-zinc-950 shadow-sm hover:bg-zinc-200",
  skipping:
    "border-zinc-500 bg-[repeating-linear-gradient(135deg,#fafafa_0,#fafafa_6px,#f4f4f5_6px,#f4f4f5_12px)] text-zinc-700 shadow-sm hover:border-zinc-600",
}

function adjustCount(
  counts: RsvpCounts,
  previousStatus: RsvpStatus | null,
  nextStatus: RsvpStatus
) {
  if (previousStatus === nextStatus) {
    return counts
  }

  const next = { ...counts }
  const countKey: Record<RsvpStatus, keyof RsvpCounts> = {
    going: "goingCount",
    maybe: "maybeCount",
    skipping: "skippingCount",
  }

  if (previousStatus) {
    const previousKey = countKey[previousStatus]
    next[previousKey] = Math.max(0, next[previousKey] - 1)
  } else {
    next.totalRsvpCount += 1
  }

  const nextKey = countKey[nextStatus]
  next[nextKey] += 1

  return next
}

export function RsvpControl({
  groupId,
  passPredictionId,
  currentUserRsvpStatus,
  goingCount,
  maybeCount,
  skippingCount,
  totalRsvpCount,
  currentUserNote,
  className,
}: RsvpControlProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticState, setOptimisticState] =
    useState<OptimisticSnapshot | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const selectedStatus =
    optimisticState?.status ?? currentUserRsvpStatus
  const counts =
    optimisticState?.counts ?? {
      goingCount,
      maybeCount,
      skippingCount,
      totalRsvpCount,
    }

  function submitRsvp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isPending) {
      return
    }

    const submitter = (event.nativeEvent as SubmitEvent).submitter

    if (!(submitter instanceof HTMLButtonElement)) {
      return
    }

    const status = submitter.value as RsvpStatus

    if (!options.some((option) => option.status === status)) {
      return
    }

    const previousOptimisticState = optimisticState
    const formData = new FormData(event.currentTarget)
    formData.set("status", status)
    setErrorMessage(null)
    setOptimisticState({
      status,
      counts: adjustCount(counts, selectedStatus, status),
    })

    startTransition(async () => {
      try {
        const result = await upsertRsvpAction(
          initialRsvpActionState,
          formData
        )

        if (!result.ok) {
          const message =
            result.message ?? "RSVP could not be updated. Try again."
          setOptimisticState(previousOptimisticState)
          setErrorMessage(message)
          toast.error(message)
          return
        }

        toast.success("RSVP updated.")
        router.refresh()
      } catch {
        setOptimisticState(previousOptimisticState)
        setErrorMessage("RSVP could not be updated. Try again.")
        toast.error("RSVP could not be updated. Try again.")
      }
    })
  }

  return (
    <div className={cn("space-y-3", className)}>
      <RsvpSummary
        goingCount={counts.goingCount}
        maybeCount={counts.maybeCount}
        skippingCount={counts.skippingCount}
        totalRsvpCount={counts.totalRsvpCount}
        currentUserRsvpStatus={selectedStatus}
      />

      <form onSubmit={submitRsvp} className="space-y-2">
        <input type="hidden" name="groupId" value={groupId} />
        <input type="hidden" name="passPredictionId" value={passPredictionId} />
        <input type="hidden" name="note" value={currentUserNote ?? ""} />

        <div className="flex flex-wrap gap-1.5" aria-label="RSVP controls">
          {options.map((option) => {
            const active = selectedStatus === option.status

            return (
              <Button
                key={option.status}
                type="submit"
                name="status"
                value={option.status}
                variant="outline"
                size="sm"
                disabled={isPending}
                aria-pressed={active}
                className={cn(
                  "rounded-md border font-semibold transition-colors",
                  active
                    ? activeClass[option.status]
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                )}
              >
                {isPending && active ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {option.label}
              </Button>
            )
          })}
        </div>

        {errorMessage ? (
          <p className="text-xs leading-5 text-red-700">{errorMessage}</p>
        ) : null}
      </form>
    </div>
  )
}
