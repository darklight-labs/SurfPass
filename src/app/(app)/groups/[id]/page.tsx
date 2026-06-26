import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, ArrowLeft } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GroupHeader } from "@/components/groups/group-header"
import { GroupMembersList } from "@/components/groups/group-members-list"
import { GroupPassFeed } from "@/components/groups/group-pass-feed"
import { GroupPassRefreshButton } from "@/components/groups/group-pass-refresh-button"
import { GroupSubscriptionsList } from "@/components/groups/group-subscriptions-list"
import { GroupSubscriptionForm } from "@/components/forms/group-subscription-form"
import { PageHeader } from "@/components/surface/page-header"
import { SectionBlock } from "@/components/surface/section-block"
import { SwissGrid } from "@/components/surface/swiss-grid"
import { SystemEvidencePanel } from "@/components/system/system-evidence-panel"
import {
  getGroupDetail,
  getGroupSubscriptionOptions,
} from "@/lib/groups/queries"
import { getGroupPassFeed } from "@/lib/passes/queries"
import { getSystemEvidenceForGroup } from "@/lib/system/queries"

export const dynamic = "force-dynamic"

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [{ group, members, subscriptions, error }, options, passFeed, evidence] =
    await Promise.all([
      getGroupDetail(id),
      getGroupSubscriptionOptions(),
      getGroupPassFeed(id),
      getSystemEvidenceForGroup(id),
    ])

  if (!group && !error) {
    notFound()
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Group"
        title={group?.name ?? "Group unavailable"}
        description={
          group?.description ??
          "Subscriptions define what this group watches and from where."
        }
        actions={
          <Button asChild variant="outline" className="rounded-md bg-white">
            <Link href="/groups">
              <ArrowLeft className="size-4" />
              Back to groups
            </Link>
          </Button>
        }
        meta={
          group ? (
            <Badge
              variant="outline"
              className="rounded-md border-zinc-300 bg-white px-2.5 text-xs font-semibold uppercase text-zinc-600"
            >
              {group.subscriptionCount} subscriptions
            </Badge>
          ) : null
        }
      />

      {error ? (
        <Alert className="rounded-md border-red-200 bg-red-50 text-red-950">
          <AlertTriangle className="size-4" />
          <AlertTitle>Group unavailable</AlertTitle>
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      ) : null}

      {group ? <GroupHeader group={group} /> : null}

      {group ? (
        <SwissGrid columns="dashboard">
          <SectionBlock
            label="Subscriptions"
            title="What this group watches"
            description="Each subscription combines a saved location, satellite, pass type, thresholds, and alert intent."
          >
            <GroupSubscriptionsList subscriptions={subscriptions} />
          </SectionBlock>

          <div className="space-y-8">
            <SectionBlock
              label="Add subscription"
              title="Shared watch definition"
              description="Owner-managed watch definitions keep the group pass feed deliberate."
            >
              {options.error ? (
                <Alert className="mb-4 rounded-md border-amber-200 bg-amber-50 text-amber-950">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>Options unavailable</AlertTitle>
                  <AlertDescription className="text-amber-900">
                    {options.error}
                  </AlertDescription>
                </Alert>
              ) : null}
              <GroupSubscriptionForm
                groupId={group.id}
                currentUserRole={group.currentUserRole}
                locations={options.locations}
                satellites={options.satellites}
              />
            </SectionBlock>

            <SectionBlock
              label="Members"
              title="Roster"
              description="Profile sharing is intentionally conservative; member IDs are shown unless the row is the current user."
            >
              <GroupMembersList members={members} />
            </SectionBlock>
          </div>
        </SwissGrid>
      ) : null}

      <SectionBlock
        label="Pass feed"
        title="Upcoming pass windows"
        description="Refresh on demand to turn subscriptions into cached pass cards with readiness and alert state."
      >
        <div className="space-y-4">
          {group ? (
            <GroupPassRefreshButton
              groupId={group.id}
              disabled={subscriptions.length === 0}
            />
          ) : null}
          <GroupPassFeed result={passFeed} />
        </div>
      </SectionBlock>

      <SectionBlock
        label="System evidence"
        title="Review trail"
        description="Recent cache, provider, and notification records for this group. This is here to make reliability visible during review."
      >
        <SystemEvidencePanel evidence={evidence} />
      </SectionBlock>
    </div>
  )
}
