import { Database } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CacheEvidenceViewModel } from "@/lib/system/queries"

type CacheStatusCardProps = {
  cache: CacheEvidenceViewModel
}

const badgeClass = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cached: "border-zinc-300 bg-zinc-50 text-zinc-700",
  stale: "border-amber-300 bg-amber-50 text-amber-900",
}

function formatDateTime(value?: string) {
  if (!value) {
    return "No fetch recorded"
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value))
}

function StateBadge({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn("h-7 rounded-md border px-2.5 text-xs font-semibold", className)}
    >
      {label}: {value}
    </Badge>
  )
}

export function CacheStatusCard({ cache }: CacheStatusCardProps) {
  return (
    <Card className="rounded-md border-zinc-200 bg-white shadow-none">
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Cache state
            </p>
            <p className="mt-2 text-3xl font-semibold leading-none text-zinc-950">
              {cache.totalPredictions}
            </p>
            <p className="mt-2 text-sm leading-5 text-zinc-600">
              Cached pass predictions tied to this group&apos;s subscriptions.
            </p>
          </div>
          <Database className="size-4 text-zinc-500" />
        </div>

        {cache.totalPredictions === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-600">
            No cached predictions yet. Refresh passes to populate the cache.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StateBadge
                label="Live"
                value={cache.liveCount}
                className={badgeClass.live}
              />
              <StateBadge
                label="Cached"
                value={cache.cachedCount}
                className={badgeClass.cached}
              />
              <StateBadge
                label="Stale"
                value={cache.staleCount}
                className={badgeClass.stale}
              />
            </div>
            <div className="grid gap-3 border-t border-zinc-200 pt-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Newest fetch
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-950">
                  {formatDateTime(cache.newestFetchedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Oldest fetch
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-950">
                  {formatDateTime(cache.oldestFetchedAt)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
