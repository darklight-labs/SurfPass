import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CreateGroupForm } from "@/components/groups/create-group-form"
import { PageHeader } from "@/components/surface/page-header"
import { SectionBlock } from "@/components/surface/section-block"

export default function NewGroupPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Coordination"
        title="Create group"
        description="Create the shared context where subscriptions, pass readiness, RSVP, and alerts will live."
        actions={
          <Button asChild variant="outline" className="rounded-md bg-white">
            <Link href="/groups">
              <ArrowLeft className="size-4" />
              Back to groups
            </Link>
          </Button>
        }
      />
      <SectionBlock
        label="Group record"
        title="Owner-managed coordination space"
        description="A group is created first; subscriptions are added on the group detail page."
      >
        <CreateGroupForm />
      </SectionBlock>
    </div>
  )
}
