"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type RefreshPassWarning = {
  subscriptionId?: string
  satelliteName?: string
  passType?: "visual" | "radio"
  reason: string
  message: string
}

type RefreshPassesSummary = {
  ok: true
  reason: string
  message: string
  groupId?: string
  subscriptionsChecked?: number
  providerFetchesAttempted?: number
  providerSuccesses?: number
  providerZeroResultSubscriptions?: number
  providerFailures?: number
  providerFetches?: number
  cacheHits?: number
  passesStored?: number
  passesRendered?: number
  passesNormalised?: number
  passesUpserted?: number
  warnings?: RefreshPassWarning[]
}

type RefreshPassFailure = {
  ok: false
  reason: string
  message: string
  details?: Record<string, unknown>
  subscriptionsChecked?: number
  providerFetchesAttempted?: number
  providerSuccesses?: number
  providerZeroResultSubscriptions?: number
  providerFailures?: number
  providerFetches?: number
  cacheHits?: number
  passesStored?: number
  passesRendered?: number
  passesNormalised?: number
  passesUpserted?: number
  warnings?: RefreshPassWarning[]
}

type RefreshPassResponse = RefreshPassesSummary | RefreshPassFailure

type GroupPassRefreshButtonProps = {
  groupId: string
  disabled?: boolean
}

function isRefreshResponse(payload: unknown): payload is RefreshPassResponse {
  return (
    payload !== null &&
    typeof payload === "object" &&
    "ok" in payload &&
    "reason" in payload &&
    "message" in payload
  )
}

export function GroupPassRefreshButton({
  groupId,
  disabled,
}: GroupPassRefreshButtonProps) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [summary, setSummary] = useState<RefreshPassesSummary | null>(null)
  const [error, setError] = useState<RefreshPassFailure | null>(null)

  async function refreshPasses() {
    setIsRefreshing(true)
    setError(null)
    setSummary(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/refresh-passes`, {
        method: "POST",
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setError(
          isRefreshResponse(payload) && payload.ok === false
            ? payload
            : {
                ok: false,
                reason: "unknown_refresh_error",
                message: "Pass refresh failed. Check provider and server setup.",
              }
        )
        return
      }

      if (isRefreshResponse(payload) && payload.ok === true) {
        setSummary(payload)
      }

      router.refresh()
    } catch {
      setError({
        ok: false,
        reason: "unknown_refresh_error",
        message: "Pass refresh failed. Check network access and provider setup.",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const noPassWindowsReturned =
    summary !== null &&
    (summary.passesStored ?? summary.passesUpserted ?? 0) === 0 &&
    (summary.providerFetchesAttempted ?? summary.providerFetches ?? 0) > 0 &&
    (summary.cacheHits ?? 0) === 0 &&
    (summary.providerZeroResultSubscriptions ?? 0) > 0
  const summaryWarnings = summary?.warnings ?? []
  const errorWarnings = error?.warnings ?? []
  const storedButNotRendered =
    summary !== null &&
    (summary.passesStored ?? summary.passesUpserted ?? 0) > 0 &&
    (summary.passesRendered ?? 0) === 0
  const errorMessage =
    error?.reason === "provider_error" ||
    error?.reason === "provider_invalid_response"
      ? "N2YO provider error. Check provider key/quota or try again."
      : error?.message

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={refreshPasses}
        disabled={disabled || isRefreshing}
        className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
      >
        <RefreshCw className="size-4" />
        {isRefreshing ? "Refreshing passes" : "Refresh passes"}
      </Button>

      {disabled ? (
        <p className="text-xs leading-5 text-zinc-500">
          Add at least one subscription before refreshing pass data.
        </p>
      ) : null}

      {error ? (
        <Alert className="rounded-md border-red-200 bg-red-50 text-red-950">
          <AlertTriangle className="size-4" />
          <AlertTitle>Refresh unavailable</AlertTitle>
          <AlertDescription className="space-y-2 text-red-900">
            <span className="block">{errorMessage}</span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-red-800">
              Reason: {error.reason}
            </span>
            {errorWarnings.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5">
                {errorWarnings.map((warning, index) => (
                  <li
                    key={`${warning.subscriptionId ?? "warning"}-${warning.reason}-${index}`}
                  >
                    {warning.message ?? warning.reason ?? "Refresh warning"}
                  </li>
                ))}
              </ul>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {summary ? (
        <Alert
          className={
            summaryWarnings.length > 0
              ? "rounded-md border-amber-200 bg-amber-50 text-amber-950"
              : "rounded-md border-zinc-200 bg-white"
          }
        >
          {summaryWarnings.length > 0 ? (
            <AlertTriangle className="size-4" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          <AlertTitle className="text-sm font-semibold text-zinc-950">
            {summary.reason === "refresh_completed_with_warnings" ||
            summary.reason === "provider_returned_no_passes"
              ? "Refresh completed with warnings"
              : "Refresh complete"}
          </AlertTitle>
          <AlertDescription className="space-y-2 text-sm leading-6 text-zinc-600">
            <span className="block">{summary.message}</span>
            <span className="block">
              {summary.subscriptionsChecked ?? 0} subscriptions checked,{" "}
              {summary.providerFetchesAttempted ??
                summary.providerFetches ??
                0}{" "}
              provider fetches attempted,{" "}
              {summary.providerSuccesses ?? 0} provider successes,{" "}
              {summary.providerZeroResultSubscriptions ?? 0} zero-result
              subscriptions, {summary.providerFailures ?? 0} provider failures,{" "}
              {summary.cacheHits ?? 0} cache hits,{" "}
              {summary.passesStored ?? summary.passesUpserted ?? 0} passes
              stored, {summary.passesRendered ?? 0} passes rendered.
            </span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Reason: {summary.reason}
            </span>
            {noPassWindowsReturned ? (
              <span className="block font-medium text-amber-900">
                No provider windows returned for this subscription. Try radio
                mode, lower threshold, or extend days ahead.
              </span>
            ) : null}
            {storedButNotRendered ? (
              <span className="block font-medium text-amber-900">
                Provider data was stored, but no matching feed rows were
                rendered. Check feed matching.
              </span>
            ) : null}
            {summaryWarnings.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-amber-900">
                {summaryWarnings.map((warning, index) => (
                  <li
                    key={`${warning.subscriptionId ?? "warning"}-${warning.reason}-${index}`}
                  >
                    {warning.message ?? warning.reason ?? "Refresh warning"}
                  </li>
                ))}
              </ul>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
