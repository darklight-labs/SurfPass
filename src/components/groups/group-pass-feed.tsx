import { AlertTriangle, CalendarClock } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { PassCard } from "@/components/data-display/pass-card"
import { EmptyState } from "@/components/feedback/empty-state"
import type { GroupPassFeedResult } from "@/lib/passes/queries"

type GroupPassFeedProps = {
  result: GroupPassFeedResult
}

export function GroupPassFeed({ result }: GroupPassFeedProps) {
  if (result.error) {
    return (
      <Alert className="rounded-md border-amber-200 bg-amber-50 text-amber-950">
        <AlertTriangle className="size-4" />
        <AlertTitle>Pass feed unavailable</AlertTitle>
        <AlertDescription className="text-amber-900">
          {result.error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {result.warnings.length > 0 ? (
        <Alert className="rounded-md border-amber-200 bg-amber-50 text-amber-950">
          <AlertTriangle className="size-4" />
          <AlertTitle>Provider warning</AlertTitle>
          <AlertDescription className="text-amber-900">
            {result.warnings.join(" ")}
          </AlertDescription>
        </Alert>
      ) : null}

      {result.passes.length === 0 ? (
        <EmptyState
          title="No pass forecast yet"
          description="Refresh pass data after adding a subscription. If N2YO is unavailable, SurfPass will show cached data when it exists."
          icon={<CalendarClock className="size-5" />}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {result.passes.map((pass) => (
            <PassCard
              key={
                pass.passPredictionId ??
                `${pass.satelliteName}-${pass.groupName}-${pass.localStart}-${pass.passType}`
              }
              {...pass}
            />
          ))}
        </div>
      )}
    </div>
  )
}
