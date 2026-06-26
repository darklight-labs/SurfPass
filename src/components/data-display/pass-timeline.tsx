import { Timer } from "lucide-react"

import { cn } from "@/lib/utils"

type PassTimelineProps = {
  localStart: string
  localMax: string
  localEnd: string
  durationSeconds?: number
  className?: string
}

function formatWindowDuration(durationSeconds?: number) {
  if (
    durationSeconds === undefined ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return undefined
  }

  const minutes = Math.floor(durationSeconds / 60)
  const seconds = Math.round(durationSeconds % 60)

  if (minutes === 0) {
    return `${seconds}s window`
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s window`
}

const ticks = [
  { label: "Start", position: "left" },
  { label: "Best moment", position: "center" },
  { label: "End", position: "right" },
] as const

export function PassTimeline({
  localStart,
  localMax,
  localEnd,
  durationSeconds,
  className,
}: PassTimelineProps) {
  const durationLabel = formatWindowDuration(durationSeconds)
  const values = [localStart, localMax, localEnd]

  return (
    <div
      className={cn(
        "rounded-md border border-zinc-200 bg-white p-4",
        className
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-zinc-500">
          Pass timeline
        </p>
        {durationLabel ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700">
            <Timer className="size-3" />
            {durationLabel}
          </span>
        ) : null}
      </div>

      <div className="relative px-2 pt-4">
        <div className="absolute left-4 right-4 top-[25px] h-px bg-zinc-300" />
        <div className="relative grid grid-cols-3 gap-3">
          {ticks.map((tick, index) => (
            <div
              key={tick.label}
              className={cn(
                "flex flex-col gap-3",
                tick.position === "left" && "items-start text-left",
                tick.position === "center" && "items-center text-center",
                tick.position === "right" && "items-end text-right"
              )}
            >
              <span className="z-10 size-3 rounded-full border border-zinc-950 bg-white" />
              <span className="text-xs font-semibold uppercase text-zinc-500">
                {tick.label}
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums text-zinc-950">
                {values[index]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
