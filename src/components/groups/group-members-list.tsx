import { Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/feedback/empty-state"
import type { GroupMemberViewModel } from "@/types/domain"

type GroupMembersListProps = {
  members: GroupMemberViewModel[]
}

export function GroupMembersList({ members }: GroupMembersListProps) {
  if (members.length === 0) {
    return (
      <EmptyState
        title="No members visible"
        description="Owner membership should be created automatically when a group is inserted."
        icon={<Users className="size-5" />}
      />
    )
  }

  return (
    <div className="grid gap-3">
      {members.map((member) => (
        <Card
          key={member.userId}
          className="rounded-md border-zinc-200 bg-white shadow-none"
        >
          <CardContent className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-950">
                {member.isCurrentUser ? "You" : member.displayName}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                User {member.userId.slice(0, 8)}
              </p>
            </div>
            <Badge
              className={
                member.role === "owner"
                  ? "rounded-md bg-zinc-950 px-2 text-xs font-semibold text-white"
                  : "rounded-md bg-zinc-100 px-2 text-xs font-semibold text-zinc-800"
              }
            >
              {member.role}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
