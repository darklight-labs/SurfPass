import { AlertTriangle, Bell } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { EmptyState } from "@/components/feedback/empty-state"
import { AlertPreferenceRow } from "@/components/alerts/alert-preference-row"
import type { AlertPreferenceViewModel } from "@/types/domain"

type AlertPreferencesPanelProps = {
  preferences: AlertPreferenceViewModel[]
  error?: string
}

export function AlertPreferencesPanel({
  preferences,
  error,
}: AlertPreferencesPanelProps) {
  if (error) {
    return (
      <Alert className="rounded-md border-red-200 bg-red-50 text-red-950">
        <AlertTriangle className="size-4" />
        <AlertTitle>Alert preferences unavailable</AlertTitle>
        <AlertDescription className="text-red-900">{error}</AlertDescription>
      </Alert>
    )
  }

  if (preferences.length === 0) {
    return (
      <EmptyState
        title="Join or create a group before configuring alerts"
        description="Alert preferences are stored per user and per group, so SurfPass needs a group context first."
        icon={<Bell className="size-5" />}
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
      <div className="grid gap-1 border-b border-zinc-200 px-5 py-4">
        <p className="text-xs font-semibold uppercase text-zinc-500">
          Per-group email alerts
        </p>
        <p className="text-sm leading-6 text-zinc-600">
          Alerts are deduplicated per user, group, pass, channel, and lead time.
        </p>
      </div>
      <div className="divide-y divide-zinc-200">
        {preferences.map((preference) => (
          <AlertPreferenceRow
            key={preference.groupId}
            preference={preference}
          />
        ))}
      </div>
    </div>
  )
}
