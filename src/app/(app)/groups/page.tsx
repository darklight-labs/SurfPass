import Link from "next/link"
import { Users } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GroupList } from "@/components/groups/group-list"
import { PageHeader } from "@/components/surface/page-header"
import { SectionBlock } from "@/components/surface/section-block"
import { getUserGroups } from "@/lib/groups/queries"

export const dynamic = "force-dynamic"

export default async function GroupsPage() {
  const { groups, error } = await getUserGroups()

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Coordination"
        title="Groups"
        description="Shared spaces for subscriptions, pass feeds, RSVP state, and alert preferences."
        actions={
          <Button asChild className="rounded-md">
            <Link href="/groups/new">
              <Users className="size-4" />
              New group
            </Link>
          </Button>
        }
        meta={
          <Badge
            variant="outline"
            className="rounded-md border-zinc-300 bg-white px-2.5 text-xs font-semibold uppercase text-zinc-600"
          >
            {groups.length} joined
          </Badge>
        }
      />

      {error ? (
        <Alert className="rounded-md border-red-200 bg-red-50 text-red-950">
          <AlertTitle>Groups unavailable</AlertTitle>
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      ) : null}

      <SectionBlock
        label="Shared state"
        title="Joined groups"
        description="Group subscriptions are the shared-state centre of SurfPass."
      >
        <GroupList groups={groups} />
      </SectionBlock>
    </div>
  )
}
