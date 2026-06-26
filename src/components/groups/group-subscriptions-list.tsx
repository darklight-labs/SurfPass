import { Bell, CalendarClock, Eye, Radio } from "lucide-react"
import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { EmptyState } from "@/components/feedback/empty-state"
import { cn } from "@/lib/utils"
import type { GroupSubscriptionViewModel } from "@/types/domain"

type GroupSubscriptionsListProps = {
  subscriptions: GroupSubscriptionViewModel[]
}

const passTypeClass = {
  visual: "border-sky-200 bg-sky-50 text-sky-950",
  radio: "border-zinc-300 bg-zinc-100 text-zinc-900",
}

export function GroupSubscriptionsList({
  subscriptions,
}: GroupSubscriptionsListProps) {
  if (subscriptions.length === 0) {
    return (
      <EmptyState
        title="No group subscriptions"
        description="Add a location, satellite, pass type, and thresholds to define what this group watches."
        icon={<Radio className="size-5" />}
      />
    )
  }

  return (
    <div className="grid gap-3">
      {subscriptions.map((subscription) => {
        const PassIcon = subscription.passType === "visual" ? Eye : Radio

        return (
          <Card
            key={subscription.id}
            className="rounded-md border-zinc-200 bg-white shadow-none"
          >
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <PassIcon className="size-4 text-zinc-500" />
                    <h3 className="text-lg font-semibold leading-tight text-zinc-950">
                      {subscription.satelliteName}
                    </h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-md border px-2 text-xs font-semibold",
                        passTypeClass[subscription.passType]
                      )}
                    >
                      {subscription.passType}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {subscription.locationName}
                    {subscription.noradId ? ` · NORAD ${subscription.noradId}` : ""}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="w-fit rounded-md border-zinc-300 bg-zinc-50 px-2.5 text-xs font-semibold uppercase text-zinc-600"
                >
                  Refresh from pass feed
                </Badge>
              </div>

              <Separator />

              <div className="grid gap-3 text-sm md:grid-cols-4">
                <SubscriptionFact
                  label="Threshold"
                  value={
                    subscription.passType === "visual"
                      ? `${subscription.minVisibilitySeconds} sec visible`
                      : `${subscription.minElevation}° min elevation`
                  }
                />
                <SubscriptionFact
                  label="Days ahead"
                  value={String(subscription.daysAhead)}
                />
                <SubscriptionFact
                  label="Subscription alerts"
                  value={subscription.alertsEnabled ? "Enabled" : "Skipped"}
                  icon={<Bell className="size-4" />}
                />
                <SubscriptionFact
                  label="Pass feed"
                  value="On demand"
                  icon={<CalendarClock className="size-4" />}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function SubscriptionFact({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: ReactNode
}) {
  return (
    <div>
      {icon ? <div className="mb-2 text-zinc-500">{icon}</div> : null}
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <p className="mt-1 font-medium text-zinc-950">{value}</p>
    </div>
  )
}
