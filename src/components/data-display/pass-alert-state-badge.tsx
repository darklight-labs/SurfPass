import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AlertState } from "@/types/domain"

type PassAlertStateBadgeProps = {
  state: AlertState
  className?: string
}

const alertLabel: Record<AlertState, string> = {
  off: "Alerts off",
  scheduled: "Scheduled",
  sent: "Sent",
  skipped: "Skipped",
  failed: "Failed",
}

const alertClass: Record<AlertState, string> = {
  off: "border-zinc-300 bg-white text-zinc-700",
  scheduled: "border-zinc-950 bg-zinc-950 text-white",
  sent: "border-emerald-200 bg-emerald-50 text-emerald-950",
  skipped: "border-zinc-300 bg-zinc-100 text-zinc-700",
  failed: "border-red-200 bg-red-50 text-red-950",
}

const alertIcon: Record<AlertState, LucideIcon> = {
  off: BellOff,
  scheduled: Bell,
  sent: CheckCircle2,
  skipped: BellOff,
  failed: AlertTriangle,
}

export function PassAlertStateBadge({
  state,
  className,
}: PassAlertStateBadgeProps) {
  const Icon = alertIcon[state]

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-7 rounded-md border px-2.5 text-xs font-semibold",
        alertClass[state],
        className
      )}
    >
      <Icon className="size-3" />
      {alertLabel[state]}
    </Badge>
  )
}
