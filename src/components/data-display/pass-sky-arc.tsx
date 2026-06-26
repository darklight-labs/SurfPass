import { Compass } from "lucide-react"

import { cn } from "@/lib/utils"

type PassSkyArcProps = {
  startAzCompass?: string | null
  maxAzCompass?: string | null
  endAzCompass?: string | null
  directionSummary?: string | null
  maxElevation?: number
  className?: string
}

function parseDirectionSummary(directionSummary?: string | null) {
  if (!directionSummary) {
    return []
  }

  return directionSummary
    .split("->")
    .map((part) => part.trim())
    .filter(Boolean)
}

function getDirectionParts({
  startAzCompass,
  maxAzCompass,
  endAzCompass,
  directionSummary,
}: Pick<
  PassSkyArcProps,
  "startAzCompass" | "maxAzCompass" | "endAzCompass" | "directionSummary"
>) {
  const explicit = [startAzCompass, maxAzCompass, endAzCompass].filter(
    (part): part is string => Boolean(part)
  )

  if (explicit.length > 0) {
    return explicit
  }

  return parseDirectionSummary(directionSummary)
}

function controlPointY(maxElevation?: number) {
  if (maxElevation === undefined || !Number.isFinite(maxElevation)) {
    return 38
  }

  const clamped = Math.max(0, Math.min(90, maxElevation))
  return 58 - (clamped / 90) * 34
}

export function PassSkyArc({
  startAzCompass,
  maxAzCompass,
  endAzCompass,
  directionSummary,
  maxElevation,
  className,
}: PassSkyArcProps) {
  const parts = getDirectionParts({
    startAzCompass,
    maxAzCompass,
    endAzCompass,
    directionSummary,
  })
  const displayParts = parts.length > 0 ? parts : ["Direction unavailable"]
  const arcControlY = controlPointY(maxElevation)
  const path = `M 16 70 Q 100 ${arcControlY} 184 70`

  return (
    <div
      className={cn(
        "rounded-md border border-zinc-200 bg-white p-4",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-zinc-500">
          Direction path
        </p>
        <Compass className="size-4 text-zinc-500" />
      </div>

      <svg
        viewBox="0 0 200 92"
        role="img"
        aria-label={`Direction path: ${displayParts.join(" to ")}`}
        className="h-24 w-full text-zinc-950"
      >
        <path
          d="M 16 70 L 184 70"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.14"
          strokeWidth="1"
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="16" cy="70" r="3" fill="currentColor" />
        <circle cx="100" cy={arcControlY} r="3" fill="currentColor" />
        <circle cx="184" cy="70" r="3" fill="currentColor" />
      </svg>

      <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-zinc-950">
        {displayParts.map((part, index) => (
          <span key={`${part}-${index}`} className="inline-flex items-center">
            <span>{part}</span>
            {index < displayParts.length - 1 ? (
              <span className="px-1.5 text-zinc-400">-&gt;</span>
            ) : null}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-500">
        Abstract sky arc, not a map or ground track.
      </p>
    </div>
  )
}
