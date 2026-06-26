"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Loader2, Plus, Search } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { SatelliteCatalogueItem } from "@/types/domain"

type SatelliteLookupResponse = {
  satellite?: SatelliteCatalogueItem
  status?: "existing" | "created"
  error?: string
}

type SatelliteLookupFormProps = {
  recommendedSatellites?: SatelliteCatalogueItem[]
}

function parseNoradInput(value: string) {
  const trimmed = value.trim()

  if (!/^\d+$/.test(trimmed)) {
    return null
  }

  const noradId = Number(trimmed)

  if (!Number.isInteger(noradId) || noradId <= 0 || noradId > 999999) {
    return null
  }

  return noradId
}

export function SatelliteLookupForm({
  recommendedSatellites = [],
}: SatelliteLookupFormProps) {
  const router = useRouter()
  const [noradInput, setNoradInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [satellite, setSatellite] = useState<SatelliteCatalogueItem | null>(null)
  const [status, setStatus] = useState<"existing" | "created" | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const noradId = parseNoradInput(noradInput)

    setError(null)
    setSatellite(null)
    setStatus(null)

    if (!noradId) {
      setError("Enter a positive numeric NORAD ID below 1000000.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/satellites/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ noradId }),
      })
      const payload = (await response.json()) as SatelliteLookupResponse

      if (!response.ok || !payload.satellite) {
        throw new Error(payload.error ?? "Satellite lookup failed.")
      }

      setSatellite(payload.satellite)
      setStatus(payload.status ?? "created")
      router.refresh()
    } catch (lookupError) {
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "Satellite lookup failed."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {recommendedSatellites.length > 0 ? (
        <div className="rounded-md border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase text-zinc-500">
                Quick add / recommended objects
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                Start with the curated objects most useful for visual, weather,
                and amateur-radio forecasting.
              </p>
            </div>
            <Badge
              variant="outline"
              className="rounded-md border-zinc-300 bg-white px-2 text-xs font-semibold uppercase text-zinc-600"
            >
              Curated
            </Badge>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recommendedSatellites.map((item) => {
              const isSelected = noradInput.trim() === String(item.noradId)

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setNoradInput(String(item.noradId))
                    setError(null)
                    setSatellite(null)
                    setStatus(null)
                  }}
                  className={cn(
                    "rounded-md border p-3 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
                    isSelected
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400 hover:bg-zinc-50"
                  )}
                >
                  <span className="block text-sm font-semibold leading-none">
                    {item.name}
                  </span>
                  <span
                    className={cn(
                      "mt-2 block text-xs font-medium",
                      isSelected ? "text-zinc-300" : "text-zinc-500"
                    )}
                  >
                    NORAD {item.noradId}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-md border border-zinc-200 bg-white p-4 md:grid-cols-[1fr_auto] md:items-end"
      >
        <div className="space-y-2">
          <Label
            htmlFor="norad-id"
            className="text-xs font-semibold uppercase text-zinc-500"
          >
            Add by NORAD ID
          </Label>
          <Input
            id="norad-id"
            inputMode="numeric"
            value={noradInput}
            onChange={(event) => setNoradInput(event.target.value)}
            placeholder="25544"
            className="rounded-md border-zinc-300 bg-white"
            maxLength={6}
          />
          <p className="text-sm leading-6 text-zinc-600">
            Use this when a satellite is not already in the curated list.
          </p>
        </div>
        <Button type="submit" className="rounded-md" disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Add satellite
        </Button>
      </form>

      {loading ? (
        <div className="rounded-md border border-zinc-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-9 rounded-md bg-zinc-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48 rounded-sm bg-zinc-200" />
              <Skeleton className="h-3 w-72 max-w-full rounded-sm bg-zinc-200" />
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <Alert className="rounded-md border-red-200 bg-red-50 text-red-950">
          <AlertTriangle className="size-4" />
          <AlertTitle>Custom lookup failed</AlertTitle>
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      ) : null}

      {satellite ? (
        <Alert className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-950">
          <CheckCircle2 className="size-4" />
          <AlertTitle>
            {status === "existing"
              ? "Satellite already in catalogue"
              : "Satellite added"}
          </AlertTitle>
          <AlertDescription className="text-emerald-900">
            <span className="font-medium">{satellite.name}</span>{" "}
            <Badge
              variant="outline"
              className="ml-1 rounded-md border-emerald-300 bg-white px-2 text-xs font-semibold text-emerald-950"
            >
              NORAD {satellite.noradId}
            </Badge>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4">
        <div className="flex items-start gap-3">
          <Plus className="mt-0.5 size-4 text-zinc-500" />
          <p className="text-sm leading-6 text-zinc-600">
            Custom records are validated through N2YO TLE lookup, then stored as
            catalogue satellites for future group subscriptions.
          </p>
        </div>
      </div>
    </div>
  )
}
