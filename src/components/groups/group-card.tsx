import Link from "next/link"
import type { ReactNode } from "react"
import { CalendarClock, Radio, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { GroupSummaryViewModel } from "@/types/domain"

type GroupCardProps = {
  group: GroupSummaryViewModel
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Card className="rounded-md border-zinc-200 bg-white shadow-none">
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Users className="size-4 text-zinc-500" />
              <h3 className="text-lg font-semibold leading-tight text-zinc-950">
                {group.name}
              </h3>
              <Badge
                className={
                  group.currentUserRole === "owner"
                    ? "rounded-md bg-zinc-950 px-2 text-xs font-semibold text-white"
                    : "rounded-md bg-zinc-100 px-2 text-xs font-semibold text-zinc-800"
                }
              >
                {group.currentUserRole}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {group.description ??
                "Shared subscriptions, pass readiness, RSVP, and alert status."}
            </p>
          </div>
          <Button asChild size="sm" className="rounded-md">
            <Link href={`/groups/${group.id}`}>Open group</Link>
          </Button>
        </div>

        <Separator />

        <div className="grid gap-3 text-sm md:grid-cols-3">
          <GroupFact
            icon={<Users className="size-4" />}
            label="Members"
            value={String(group.memberCount)}
          />
          <GroupFact
            icon={<Radio className="size-4" />}
            label="Subscriptions"
            value={String(group.subscriptionCount)}
          />
          <GroupFact
            icon={<CalendarClock className="size-4" />}
            label="Pass feed"
            value="On demand"
          />
        </div>
      </CardContent>
    </Card>
  )
}

function GroupFact({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-zinc-500">{icon}</div>
      <p className="mt-3 text-xs font-semibold uppercase text-zinc-500">
        {label}
      </p>
      <p className="mt-1 font-medium text-zinc-950">{value}</p>
    </div>
  )
}
