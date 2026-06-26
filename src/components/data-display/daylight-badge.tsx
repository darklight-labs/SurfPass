import { Eye, Moon, Sun } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { DaylightLabel } from "@/types/domain"

type DaylightBadgeProps = {
  label?: DaylightLabel | null
  passType?: "visual" | "radio"
  className?: string
}

const labelText: Record<DaylightLabel, string> = {
  daylight: "Daylight",
  night: "Night",
  civil_twilight: "Civil twilight",
  nautical_twilight: "Nautical twilight",
  astronomical_twilight: "Astronomical twilight",
  unknown: "Light unknown",
}

const labelClass: Record<DaylightLabel, string> = {
  daylight: "border-amber-300 bg-amber-50 text-amber-900",
  night: "border-slate-300 bg-slate-50 text-slate-800",
  civil_twilight: "border-zinc-300 bg-zinc-50 text-zinc-800",
  nautical_twilight: "border-zinc-300 bg-zinc-50 text-zinc-800",
  astronomical_twilight: "border-zinc-300 bg-zinc-50 text-zinc-800",
  unknown: "border-zinc-300 bg-white text-zinc-600",
}

function DaylightIcon({ label }: { label: DaylightLabel }) {
  if (label === "daylight") {
    return <Sun className="size-3" />
  }

  if (label === "night") {
    return <Moon className="size-3" />
  }

  return <Eye className="size-3" />
}

export function DaylightBadge({
  label,
  passType,
  className,
}: DaylightBadgeProps) {
  const resolvedLabel = label ?? "unknown"
  const detail =
    resolvedLabel === "daylight" && passType === "radio"
      ? "Daylight radio window"
      : labelText[resolvedLabel]

  return (
    <Badge
      variant="outline"
      aria-label={`Light context: ${labelText[resolvedLabel]}`}
      className={cn(
        "h-6 rounded-md border px-2 text-xs font-semibold",
        labelClass[resolvedLabel],
        className
      )}
    >
      <DaylightIcon label={resolvedLabel} />
      {detail}
    </Badge>
  )
}
