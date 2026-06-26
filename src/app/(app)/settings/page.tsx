import { Bell } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { AlertPreferencesPanel } from "@/components/alerts/alert-preferences-panel"
import { PageHeader } from "@/components/surface/page-header"
import { SectionBlock } from "@/components/surface/section-block"
import { getAlertPreferencesForCurrentUser } from "@/lib/alerts/queries"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const { preferences, error } = await getAlertPreferencesForCurrentUser()
  const enabledCount = preferences.filter(
    (preference) => preference.emailEnabled
  ).length

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Alert readiness"
        title="Settings"
        description="Choose how SurfPass reminds you before useful satellite pass windows open."
        meta={
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="rounded-md border-zinc-300 bg-white px-2.5 text-xs font-semibold uppercase text-zinc-600"
            >
              <Bell className="size-3" />
              Email MVP
            </Badge>
            <Badge
              variant="outline"
              className="rounded-md border-zinc-300 bg-white px-2.5 text-xs font-semibold uppercase text-zinc-600"
            >
              {enabledCount} enabled
            </Badge>
          </div>
        }
      />

      <SectionBlock
        label="Preferences"
        title="Group alert preferences"
        description="Email delivery uses these per-group preferences for manual tests and scheduled cron alerts."
      >
        <AlertPreferencesPanel preferences={preferences} error={error} />
      </SectionBlock>
    </div>
  )
}
