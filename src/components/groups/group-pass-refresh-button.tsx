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

type RefreshPassesSummary = {
  groupId: string
  subscriptionsChecked: number
  providerFetches: number
  cacheHits: number
  passesUpserted: number
  warnings: string[]
}

type GroupPassRefreshButtonProps = {
  groupId: string
  disabled?: boolean
}

export function GroupPassRefreshButton({
  groupId,
  disabled,
}: GroupPassRefreshButtonProps) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [summary, setSummary] = useState<RefreshPassesSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refreshPasses() {
    setIsRefreshing(true)
    setError(null)
    setSummary(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/refresh-passes`, {
        method: "POST",
      })
      const payload = (await response.json().catch(() => null)) as
        | (RefreshPassesSummary & { error?: string })
        | null

      if (!response.ok) {
        setError(payload?.error ?? "Pass refresh failed.")
        return
      }

      if (payload) {
        setSummary(payload)
      }

      router.refresh()
    } catch {
      setError("Pass refresh failed. Check network access and provider setup.")
    } finally {
      setIsRefreshing(false)
    }
  }

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
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      ) : null}

      {summary ? (
        <Alert className="rounded-md border-zinc-200 bg-white">
          <CheckCircle2 className="size-4" />
          <AlertTitle className="text-sm font-semibold text-zinc-950">
            Refresh complete
          </AlertTitle>
          <AlertDescription className="space-y-2 text-sm leading-6 text-zinc-600">
            <span className="block">
              {summary.subscriptionsChecked} subscriptions checked,{" "}
              {summary.cacheHits} cache hits, {summary.providerFetches} provider
              fetches, {summary.passesUpserted} passes stored.
            </span>
            {summary.warnings.length > 0 ? (
              <span className="block text-amber-800">
                {summary.warnings.join(" ")}
              </span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
