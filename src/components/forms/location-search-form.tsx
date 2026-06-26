"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MapPin, Search, Star } from "lucide-react"

import { saveLocationAction } from "@/app/(app)/locations/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/feedback/empty-state"
import { cn } from "@/lib/utils"
import { formatCoordinate, formatMeters } from "@/lib/utils/formatting"
import type { GeocodedLocationOption } from "@/types/domain"

type GeocodeApiResponse = {
  results?: GeocodedLocationOption[]
  error?: string
}

type SaveMode = "standard" | "default"

type MessageState = {
  ok: boolean
  text: string
} | null

function placeDetail(option: GeocodedLocationOption) {
  return [option.admin1, option.country].filter(Boolean).join(", ")
}

function saveKey(option: GeocodedLocationOption, mode: SaveMode) {
  return `${String(option.providerId)}-${mode}`
}

export function LocationSearchForm() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GeocodedLocationOption[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<MessageState>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = query.trim()

    setError(null)
    setMessage(null)

    if (trimmed.length < 2) {
      setSearched(true)
      setResults([])
      setError("Enter at least 2 characters to search for a place.")
      return
    }

    setLoading(true)
    setSearched(true)

    try {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(trimmed)}`
      )
      const payload = (await response.json()) as GeocodeApiResponse

      if (!response.ok) {
        throw new Error(payload.error ?? "Location search failed.")
      }

      setResults(payload.results ?? [])
    } catch (searchError) {
      setResults([])
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Location search failed."
      )
    } finally {
      setLoading(false)
    }
  }

  function handleSave(option: GeocodedLocationOption, mode: SaveMode) {
    const key = saveKey(option, mode)

    setMessage(null)
    setSavingKey(key)

    startTransition(() => {
      void (async () => {
        try {
          const result = await saveLocationAction({
            ...option,
            isDefault: mode === "default",
          })

          setMessage({
            ok: result.ok,
            text: result.message,
          })

          if (result.ok) {
            router.refresh()
          }
        } catch {
          setMessage({
            ok: false,
            text: "Location could not be saved.",
          })
        } finally {
          setSavingKey(null)
        }
      })()
    })
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSearch}
        className="grid gap-3 rounded-md border border-zinc-200 bg-white p-4 md:grid-cols-[1fr_auto] md:items-end"
      >
        <div className="space-y-2">
          <Label
            htmlFor="location-query"
            className="text-xs font-semibold uppercase text-zinc-500"
          >
            Place search
          </Label>
          <Input
            id="location-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cape Town, South Africa"
            className="rounded-md border-zinc-300 bg-white"
            maxLength={100}
          />
        </div>
        <Button type="submit" className="rounded-md" disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Search
        </Button>
      </form>

      {error ? (
        <Alert className="rounded-md border-red-200 bg-red-50 text-red-950">
          <AlertTitle>Location search failed</AlertTitle>
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      ) : null}

      {message ? (
        <Alert
          className={cn(
            "rounded-md",
            message.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border-red-200 bg-red-50 text-red-950"
          )}
        >
          <AlertTitle>{message.ok ? "Location saved" : "Save failed"}</AlertTitle>
          <AlertDescription
            className={message.ok ? "text-emerald-900" : "text-red-900"}
          >
            {message.text}
          </AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="rounded-md border border-zinc-200 bg-white p-4"
            >
              <Skeleton className="h-4 w-52 rounded-sm bg-zinc-200" />
              <Skeleton className="mt-3 h-3 w-72 max-w-full rounded-sm bg-zinc-200" />
              <Skeleton className="mt-4 h-8 w-40 rounded-sm bg-zinc-200" />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && searched && results.length === 0 && !error ? (
        <EmptyState
          title="No matching places"
          description="Try a more specific city, town, region, or operating site name."
          icon={<Search className="size-5" />}
          className="p-6"
        />
      ) : null}

      {!loading && results.length > 0 ? (
        <div className="space-y-3">
          {results.map((option) => {
            const detail = placeDetail(option)
            const standardKey = saveKey(option, "standard")
            const defaultKey = saveKey(option, "default")

            return (
              <Card
                key={String(option.providerId)}
                className="rounded-md border-zinc-200 bg-white shadow-none"
              >
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <MapPin className="size-4 text-zinc-500" />
                        <h3 className="text-lg font-semibold leading-tight text-zinc-950">
                          {option.name}
                        </h3>
                      </div>
                      {detail ? (
                        <p className="mt-2 text-sm leading-6 text-zinc-600">
                          {detail}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-md bg-white"
                        disabled={isPending || savingKey !== null}
                        onClick={() => handleSave(option, "standard")}
                      >
                        {savingKey === standardKey ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <MapPin className="size-4" />
                        )}
                        Save location
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-md"
                        disabled={isPending || savingKey !== null}
                        onClick={() => handleSave(option, "default")}
                      >
                        {savingKey === defaultKey ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Star className="size-4" />
                        )}
                        Save default
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-3 text-sm text-zinc-600 md:grid-cols-4">
                    <LocationFact
                      label="Latitude"
                      value={formatCoordinate(option.latitude)}
                    />
                    <LocationFact
                      label="Longitude"
                      value={formatCoordinate(option.longitude)}
                    />
                    <LocationFact
                      label="Elevation"
                      value={
                        option.elevationM === undefined
                          ? "Saves as 0 m"
                          : formatMeters(option.elevationM)
                      }
                    />
                    <LocationFact
                      label="Timezone"
                      value={option.timezone ?? "Unavailable"}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function LocationFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <Badge
        variant="outline"
        className="mt-2 rounded-md border-zinc-300 bg-zinc-50 px-2 text-xs font-semibold text-zinc-700"
      >
        {value}
      </Badge>
    </div>
  )
}
