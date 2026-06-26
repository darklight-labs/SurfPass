import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatFetchedAt } from "@/lib/utils/dates"
import { operationalStates } from "@/styles/design-tokens"

export type ProviderDataState = "live" | "cached" | "stale" | "unavailable"

type StaleCacheAlertProps = {
  dataState: ProviderDataState
  fetchedAt?: string | Date
  title?: string
  description?: string
  className?: string
}

const content: Record<
  ProviderDataState,
  { title: string; description: string; icon: typeof CheckCircle2 }
> = {
  live: {
    title: "Live provider data",
    description: "This pass feed is using the latest provider response.",
    icon: CheckCircle2,
  },
  cached: {
    title: "Cached provider data",
    description:
      "This view is using cached N2YO pass data to protect provider limits.",
    icon: RefreshCw,
  },
  stale: {
    title: "Stale provider data",
    description:
      "The latest provider refresh is unavailable. Cached pass windows remain visible.",
    icon: AlertTriangle,
  },
  unavailable: {
    title: "Provider data unavailable",
    description:
      "No cached pass window is available yet. Refresh pass data from a group page after adding a subscription.",
    icon: AlertTriangle,
  },
}

export function StaleCacheAlert({
  dataState,
  fetchedAt,
  title,
  description,
  className,
}: StaleCacheAlertProps) {
  const Icon = content[dataState].icon

  return (
    <Alert className={cn("rounded-md border-zinc-200 bg-white", className)}>
      <Icon className="size-4" />
      <AlertTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-950">
        {title ?? content[dataState].title}
        <Badge
          variant="outline"
          className={cn(
            "h-6 rounded-md border px-2 text-xs font-semibold uppercase",
            operationalStates[dataState]
          )}
        >
          {dataState}
        </Badge>
      </AlertTitle>
      <AlertDescription className="text-sm leading-6 text-zinc-600">
        {description ?? content[dataState].description}{" "}
        {fetchedAt
          ? `Fetched: ${formatFetchedAt(fetchedAt)}.`
          : "No provider fetch recorded."}
      </AlertDescription>
    </Alert>
  )
}
