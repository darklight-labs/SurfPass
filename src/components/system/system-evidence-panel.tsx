import { AlertTriangle, Bell, CheckCircle2 } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CacheStatusCard } from "@/components/system/cache-status-card"
import { NotificationDeliveriesTable } from "@/components/system/notification-deliveries-table"
import { ProviderLogList } from "@/components/system/provider-log-list"
import type { SystemEvidenceResult } from "@/lib/system/queries"

type SystemEvidencePanelProps = {
  evidence: SystemEvidenceResult
}

function AlertReadinessCard({
  evidence,
}: {
  evidence: SystemEvidenceResult["alertReadiness"]
}) {
  return (
    <Card className="rounded-md border-zinc-200 bg-white shadow-none">
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Alert readiness
            </p>
            <p className="mt-2 text-3xl font-semibold leading-none text-zinc-950">
              {evidence.alertsEnabledSubscriptions}/
              {evidence.totalSubscriptions}
            </p>
            <p className="mt-2 text-sm leading-5 text-zinc-600">
              Subscriptions with alert intent enabled.
            </p>
          </div>
          <Bell className="size-4 text-zinc-500" />
        </div>

        <div className="grid gap-3 border-t border-zinc-200 pt-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Your email alerts
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-950">
              {evidence.currentUserEmailEnabled ? "Enabled" : "Disabled"} /{" "}
              {evidence.currentUserLeadMinutes} min
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              {evidence.currentUserPreferencePersisted
                ? "Preference persisted."
                : "Using default preference until saved."}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Group email-ready members
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-950">
              {evidence.membersWithEmailAlertsEnabled === null ||
              evidence.membersWithEmailAlertsEnabled === undefined
                ? "Unavailable"
                : evidence.membersWithEmailAlertsEnabled}
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Count only; member preference rows are not exposed.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-3">
          <Badge
            variant="outline"
            className="h-7 rounded-md border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-700"
          >
            {evidence.cronReadinessNote}
          </Badge>
          <Badge
            variant="outline"
            className={
              evidence.manualAlertReady
                ? "h-7 rounded-md border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800"
                : "h-7 rounded-md border-amber-300 bg-amber-50 px-2.5 text-xs font-semibold text-amber-900"
            }
          >
            {evidence.manualAlertReady ? (
              <CheckCircle2 className="size-3" />
            ) : (
              <AlertTriangle className="size-3" />
            )}
            Manual test alert{" "}
            {evidence.manualAlertReady ? "ready" : "needs cached pass"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export function SystemEvidencePanel({ evidence }: SystemEvidencePanelProps) {
  if (evidence.error) {
    return (
      <Alert className="rounded-md border-amber-200 bg-amber-50 text-amber-950">
        <AlertTriangle className="size-4" />
        <AlertTitle>System evidence unavailable</AlertTitle>
        <AlertDescription className="text-amber-900">
          {evidence.error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {evidence.warnings.length > 0 ? (
        <Alert className="rounded-md border-amber-200 bg-amber-50 text-amber-950">
          <AlertTriangle className="size-4" />
          <AlertTitle>Evidence warning</AlertTitle>
          <AlertDescription className="text-amber-900">
            {evidence.warnings.join(" ")}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <CacheStatusCard cache={evidence.cache} />
        <AlertReadinessCard evidence={evidence.alertReadiness} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            Provider fetch attempts
          </p>
          <ProviderLogList logs={evidence.providerLogs} />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            Your notification deliveries
          </p>
          <NotificationDeliveriesTable
            deliveries={evidence.notificationDeliveries}
          />
        </div>
      </div>
    </div>
  )
}
