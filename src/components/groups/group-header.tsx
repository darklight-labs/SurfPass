import { Bell, Radio, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { MetricCard } from "@/components/surface/metric-card"
import { SwissGrid } from "@/components/surface/swiss-grid"
import type { GroupDetailViewModel } from "@/types/domain"

type GroupHeaderProps = {
  group: GroupDetailViewModel
}

export function GroupHeader({ group }: GroupHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge
          className={
            group.currentUserRole === "owner"
              ? "rounded-md bg-zinc-950 px-2 text-xs font-semibold text-white"
              : "rounded-md bg-zinc-100 px-2 text-xs font-semibold text-zinc-800"
          }
        >
          {group.currentUserRole}
        </Badge>
        <Badge
          variant="outline"
          className="rounded-md border-zinc-300 bg-white px-2.5 text-xs font-semibold uppercase text-zinc-600"
        >
          Shared subscriptions
        </Badge>
      </div>
      <SwissGrid columns="three">
        <MetricCard
          label="Members"
          value={String(group.memberCount)}
          detail="Roster visible to group members."
          icon={Users}
        />
        <MetricCard
          label="Subscriptions"
          value={String(group.subscriptionCount)}
          detail="Location, satellite, pass type, thresholds."
          icon={Radio}
        />
        <MetricCard
          label="Alert readiness"
          value="Email"
          detail="Members configure per-group lead times in Settings."
          icon={Bell}
        />
      </SwissGrid>
    </div>
  )
}
