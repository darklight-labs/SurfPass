"use client"

import { useActionState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { upsertRsvpAction } from "@/lib/rsvps/actions"
import { initialRsvpActionState } from "@/lib/rsvps/types"
import { cn } from "@/lib/utils"
import type { RsvpStatus } from "@/types/domain"

type RsvpControlProps = {
  groupId: string
  passPredictionId: string
  currentUserRsvp?: RsvpStatus
  currentUserNote?: string | null
  className?: string
}

const options: Array<{ status: RsvpStatus; label: string }> = [
  { status: "going", label: "Going" },
  { status: "maybe", label: "Maybe" },
  { status: "skipping", label: "Skipping" },
]

export function RsvpControl({
  groupId,
  passPredictionId,
  currentUserRsvp,
  currentUserNote,
  className,
}: RsvpControlProps) {
  const [state, formAction, isPending] = useActionState(
    upsertRsvpAction,
    initialRsvpActionState
  )

  useEffect(() => {
    if (!state.message || !state.updatedAt) {
      return
    }

    if (state.ok) {
      toast.success("RSVP updated.")
      return
    }

    toast.error(state.message)
  }, [state])

  return (
    <form action={formAction} className={cn("space-y-2", className)}>
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="passPredictionId" value={passPredictionId} />
      <input type="hidden" name="note" value={currentUserNote ?? ""} />

      <div className="flex flex-wrap gap-1.5" aria-label="RSVP controls">
        {options.map((option) => {
          const active = currentUserRsvp === option.status

          return (
            <Button
              key={option.status}
              type="submit"
              name="status"
              value={option.status}
              variant={active ? "default" : "outline"}
              size="sm"
              disabled={isPending}
              className={cn(
                "rounded-md",
                active
                  ? "bg-zinc-950 text-white hover:bg-zinc-800"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
              )}
            >
              {isPending && active ? <Loader2 className="size-4 animate-spin" /> : null}
              {option.label}
            </Button>
          )
        })}
      </div>

      {state.message && !state.ok ? (
        <p className="text-xs leading-5 text-red-700">{state.message}</p>
      ) : null}
    </form>
  )
}
