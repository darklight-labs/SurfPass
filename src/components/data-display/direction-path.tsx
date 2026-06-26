import { Compass } from "lucide-react"

import { cn } from "@/lib/utils"

type DirectionPathProps = {
  directionSummary: string | string[]
  className?: string
}

export function DirectionPath({
  directionSummary,
  className,
}: DirectionPathProps) {
  const parts = Array.isArray(directionSummary)
    ? directionSummary
    : directionSummary.split("->").map((part) => part.trim()).filter(Boolean)
  const displayParts = parts.length > 0 ? parts : ["Direction unavailable"]

  return (
    <div
      className={cn(
        "inline-flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-900",
        className
      )}
    >
      <Compass className="size-4 shrink-0 text-zinc-500" />
      <span className="sr-only">Direction path:</span>
      <span className="min-w-0 truncate">
        {displayParts.map((part, index) => (
          <span key={`${part}-${index}`}>
            <span>{part}</span>
            {index < displayParts.length - 1 ? (
              <span className="px-1.5 text-zinc-400">-&gt;</span>
            ) : null}
          </span>
        ))}
      </span>
    </div>
  )
}
