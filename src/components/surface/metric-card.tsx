import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type MetricCardProps = {
  label: string
  value: string
  detail?: string
  icon?: LucideIcon
  tone?: "neutral" | "good" | "warn" | "critical"
  className?: string
}

const toneClass: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  neutral: "text-zinc-500",
  good: "text-emerald-700",
  warn: "text-amber-700",
  critical: "text-red-700",
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("rounded-md border-zinc-200 shadow-none", className)}>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
          {Icon ? <Icon className={cn("size-4", toneClass[tone])} /> : null}
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none text-zinc-950">
            {value}
          </p>
          {detail ? (
            <p className="mt-2 text-sm leading-5 text-zinc-600">{detail}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
