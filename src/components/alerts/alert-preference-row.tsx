"use client"

import { useActionState, useMemo, useState } from "react"
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  Loader2,
} from "lucide-react"

import {
  ALERT_LEAD_TIME_OPTIONS,
  DEFAULT_ALERT_LEAD_MINUTES,
} from "@/lib/alerts/constants"
import {
  initialAlertPreferenceActionState,
  updateAlertPreferenceAction,
} from "@/lib/alerts/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { AlertPreferenceViewModel } from "@/types/domain"

type AlertPreferenceRowProps = {
  preference: AlertPreferenceViewModel
}

function formatUpdatedAt(value?: string | null) {
  if (!value) {
    return "Default preference, not persisted yet"
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value))
}

export function AlertPreferenceRow({ preference }: AlertPreferenceRowProps) {
  const [state, formAction, isPending] = useActionState(
    updateAlertPreferenceAction,
    initialAlertPreferenceActionState
  )
  const [emailEnabled, setEmailEnabled] = useState(preference.emailEnabled)
  const [leadMinutes, setLeadMinutes] = useState(preference.leadMinutes)
  const leadTimeOptions = useMemo(() => {
    return Array.from(
      new Set([...ALERT_LEAD_TIME_OPTIONS, preference.leadMinutes])
    ).sort((a, b) => a - b)
  }, [preference.leadMinutes])
  const StatusIcon = emailEnabled ? Bell : BellOff

  return (
    <form
      action={formAction}
      className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center"
    >
      <input type="hidden" name="groupId" value={preference.groupId} />
      <input
        type="hidden"
        name="emailEnabled"
        value={emailEnabled ? "true" : "false"}
      />
      <input type="hidden" name="leadMinutes" value={leadMinutes} />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusIcon className="size-4 text-zinc-500" />
          <h3 className="text-lg font-semibold leading-tight text-zinc-950">
            {preference.groupName}
          </h3>
          <Badge
            variant="outline"
            className="rounded-md border-zinc-300 bg-zinc-50 px-2 text-xs font-semibold uppercase text-zinc-600"
          >
            {preference.currentUserRole}
          </Badge>
          {!preference.isPersisted ? (
            <Badge
              variant="outline"
              className="rounded-md border-amber-200 bg-amber-50 px-2 text-xs font-semibold uppercase text-amber-950"
            >
              Default
            </Badge>
          ) : null}
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          {emailEnabled
            ? `Email reminders are scheduled ${leadMinutes} minutes before qualifying passes.`
            : "Email reminders are off for this group."}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Last updated: {formatUpdatedAt(preference.updatedAt)}
        </p>

        {state.message ? (
          <Alert
            className={
              state.ok
                ? "mt-4 rounded-md border-emerald-200 bg-emerald-50 text-emerald-950"
                : "mt-4 rounded-md border-red-200 bg-red-50 text-red-950"
            }
          >
            {state.ok ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <AlertTriangle className="size-4" />
            )}
            <AlertTitle>
              {state.ok ? "Preference saved" : "Preference failed"}
            </AlertTitle>
            <AlertDescription
              className={state.ok ? "text-emerald-900" : "text-red-900"}
            >
              {state.message}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto_auto_auto] sm:items-center">
        <label className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 sm:justify-start">
          <span className="text-sm font-medium text-zinc-950">Email</span>
          <Switch
            checked={emailEnabled}
            onCheckedChange={setEmailEnabled}
            disabled={isPending}
            aria-label={`Email alerts for ${preference.groupName}`}
          />
        </label>

        <Select
          value={String(leadMinutes)}
          onValueChange={(value) => setLeadMinutes(Number(value))}
          disabled={isPending || !emailEnabled}
        >
          <SelectTrigger
            aria-label={`Alert lead time for ${preference.groupName}`}
            className="w-full rounded-md border-zinc-300 bg-white sm:w-36"
          >
            <SelectValue placeholder={`${DEFAULT_ALERT_LEAD_MINUTES} min`} />
          </SelectTrigger>
          <SelectContent className="rounded-md">
            {leadTimeOptions.map((minutes) => (
              <SelectItem key={minutes} value={String(minutes)}>
                {minutes} min
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="submit" className="rounded-md" disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Bell className="size-4" />
          )}
          Update preferences
        </Button>
      </div>
    </form>
  )
}
