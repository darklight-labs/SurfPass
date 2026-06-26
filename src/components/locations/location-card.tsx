"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MapPin, Star, Trash } from "lucide-react"

import {
  deleteLocationAction,
  setDefaultLocationAction,
} from "@/app/(app)/locations/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { formatCoordinate, formatMeters } from "@/lib/utils/formatting"
import type { SavedLocationViewModel } from "@/types/domain"

type LocationCardProps = {
  location: SavedLocationViewModel
}

type ActionMode = "default" | "delete"

export function LocationCard({ location }: LocationCardProps) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [messageOk, setMessageOk] = useState(true)
  const [activeAction, setActiveAction] = useState<ActionMode | null>(null)
  const [isPending, startTransition] = useTransition()

  function runAction(mode: ActionMode) {
    if (
      mode === "delete" &&
      !window.confirm(`Delete saved location "${location.name}"?`)
    ) {
      return
    }

    setMessage(null)
    setActiveAction(mode)

    startTransition(() => {
      void (async () => {
        try {
          const result =
            mode === "default"
              ? await setDefaultLocationAction(location.id)
              : await deleteLocationAction(location.id)

          setMessage(result.message)
          setMessageOk(result.ok)

          if (result.ok) {
            router.refresh()
          }
        } catch {
          setMessage("Location action failed.")
          setMessageOk(false)
        } finally {
          setActiveAction(null)
        }
      })()
    })
  }

  return (
    <Card className="rounded-md border-zinc-200 bg-white shadow-none">
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <MapPin className="size-4 text-zinc-500" />
              <h3 className="text-lg font-semibold leading-tight text-zinc-950">
                {location.name}
              </h3>
              {location.isDefault ? (
                <Badge className="rounded-md bg-zinc-950 px-2 text-xs font-semibold text-white">
                  Default
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {[location.label, location.country].filter(Boolean).join(", ") ||
                "Observer location"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-md bg-white"
              disabled={isPending || activeAction !== null || location.isDefault}
              onClick={() => runAction("default")}
            >
              {activeAction === "default" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Star className="size-4" />
              )}
              Set default
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-md border-red-200 bg-white text-red-800 hover:bg-red-50 hover:text-red-950"
              disabled={isPending || activeAction !== null}
              onClick={() => runAction("delete")}
            >
              {activeAction === "delete" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash className="size-4" />
              )}
              Delete
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid gap-3 text-sm md:grid-cols-4">
          <LocationFact
            label="Latitude"
            value={formatCoordinate(location.latitude)}
          />
          <LocationFact
            label="Longitude"
            value={formatCoordinate(location.longitude)}
          />
          <LocationFact
            label="Elevation"
            value={formatMeters(location.elevationM)}
          />
          <LocationFact
            label="Timezone"
            value={location.timezone ?? "Unavailable"}
          />
        </div>

        {message ? (
          <p
            className={cn(
              "border-t border-zinc-200 pt-3 text-sm",
              messageOk ? "text-zinc-600" : "text-red-800"
            )}
          >
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function LocationFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <p className="mt-2 font-medium text-zinc-950">{value}</p>
    </div>
  )
}
