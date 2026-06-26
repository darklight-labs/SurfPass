import { Users } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/feedback/empty-state"
import { GroupCard } from "@/components/groups/group-card"
import type { GroupSummaryViewModel } from "@/types/domain"

type GroupListProps = {
  groups: GroupSummaryViewModel[]
}

export function GroupList({ groups }: GroupListProps) {
  if (groups.length === 0) {
    return (
      <EmptyState
        title="No coordination groups"
        description="Create a group to define shared satellite subscriptions before pass feeds, RSVP, and alert intent have context."
        icon={<Users className="size-5" />}
        action={
          <Button asChild className="rounded-md">
            <Link href="/groups/new">Create group</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} />
      ))}
    </div>
  )
}
