import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"
import { formatElevation } from "@/lib/utils/formatting"
import type { PassScore } from "@/types/domain"

type ElevationIndicatorProps = {
  maxElevation?: number
  score?: PassScore
  className?: string
}

const scoreMarkerClass: Record<PassScore, string> = {
  excellent: "border-zinc-950 bg-zinc-950",
  good: "border-zinc-700 bg-zinc-700",
  low: "border-amber-700 bg-amber-700",
}

const scaleTicks = [
  { label: "90°", detail: "overhead", value: 90 },
  { label: "60°", detail: "strong", value: 60 },
  { label: "30°", detail: "useful", value: 30 },
  { label: "0°", detail: "horizon", value: 0 },
]

function elevationPercent(maxElevation?: number) {
  if (maxElevation === undefined || !Number.isFinite(maxElevation)) {
    return 0
  }

  return (Math.max(0, Math.min(90, maxElevation)) / 90) * 100
}

export function ElevationIndicator({
  maxElevation,
  score = "low",
  className,
}: ElevationIndicatorProps) {
  const markerStyle: CSSProperties = {
    bottom: `${elevationPercent(maxElevation)}%`,
  }
  const markerClass = scoreMarkerClass[score]

  return (
    <div
      className={cn(
        "rounded-md border border-zinc-200 bg-white p-4",
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">
            Max elevation
          </p>
          <p className="mt-1 text-2xl font-semibold leading-none text-zinc-950">
            {maxElevation === undefined
              ? "Unknown"
              : formatElevation(maxElevation)}
          </p>
        </div>
        <span className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs font-semibold uppercase text-zinc-600">
          {score}
        </span>
      </div>

      <div className="grid grid-cols-[48px_1fr] gap-4">
        <div className="relative h-32">
          <div className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-zinc-300" />
          <div
            className={cn(
              "absolute left-1/2 size-3 -translate-x-1/2 translate-y-1/2 rounded-full border",
              markerClass
            )}
            style={markerStyle}
            aria-hidden="true"
          />
        </div>
        <div className="relative h-32">
          {scaleTicks.map((tick) => (
            <div
              key={tick.value}
              className="absolute left-0 right-0 flex items-center gap-3"
              style={{ bottom: `${(tick.value / 90) * 100}%` }}
            >
              <span className="h-px flex-1 bg-zinc-200" />
              <span className="w-20 text-right text-xs font-semibold uppercase text-zinc-500">
                {tick.label} {tick.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="sr-only">
        Max elevation scale from 0 degrees horizon to 90 degrees overhead.
      </p>
    </div>
  )
}
