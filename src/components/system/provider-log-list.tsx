import { Radio } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/feedback/empty-state"
import { cn } from "@/lib/utils"
import type { ProviderLogViewModel } from "@/lib/system/queries"

type ProviderLogListProps = {
  logs: ProviderLogViewModel[]
}

const statusClass: Record<string, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
}

function statusBadgeClass(status: string) {
  return statusClass[status] ?? "border-zinc-300 bg-zinc-50 text-zinc-700"
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value))
}

export function ProviderLogList({ logs }: ProviderLogListProps) {
  if (logs.length === 0) {
    return (
      <EmptyState
        title="No provider logs recorded yet"
        description="Refresh passes to record scoped N2YO or daylight enrichment attempts for this group."
        icon={<Radio className="size-5" />}
      />
    )
  }

  return (
    <div className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
      {logs.map((log) => (
        <div key={log.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-xs font-semibold uppercase text-zinc-500">
                {log.provider} / {log.endpoint}
              </p>
              <Badge
                variant="outline"
                className={cn(
                  "h-6 rounded-md border px-2 text-xs font-semibold uppercase",
                  statusBadgeClass(log.status)
                )}
              >
                {log.status}
              </Badge>
              {log.statusCode ? (
                <Badge
                  variant="outline"
                  className="h-6 rounded-md border-zinc-300 bg-white px-2 text-xs font-semibold text-zinc-600"
                >
                  HTTP {log.statusCode}
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 break-words text-sm leading-6 text-zinc-700">
              {log.message ?? "Provider attempt recorded."}
            </p>
          </div>
          <p className="text-xs font-medium uppercase text-zinc-500 md:text-right">
            {formatDateTime(log.createdAt)}
          </p>
        </div>
      ))}
    </div>
  )
}
