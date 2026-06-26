import { Radio, Satellite } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { SatelliteCatalogueItem } from "@/types/domain"

type SatelliteCardProps = {
  satellite: SatelliteCatalogueItem
}

export function SatelliteCard({ satellite }: SatelliteCardProps) {
  const isRadio = satellite.category?.toLowerCase().includes("radio")

  return (
    <Card className="rounded-md border-zinc-200 bg-white shadow-none">
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {isRadio ? (
                <Radio className="size-4 text-zinc-500" />
              ) : (
                <Satellite className="size-4 text-zinc-500" />
              )}
              <h3 className="text-lg font-semibold leading-tight text-zinc-950">
                {satellite.name}
              </h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              NORAD {satellite.noradId}
            </p>
          </div>
          <Badge
            className={
              satellite.isCurated
                ? "rounded-md bg-zinc-950 px-2 text-xs font-semibold text-white"
                : "rounded-md bg-zinc-100 px-2 text-xs font-semibold text-zinc-800"
            }
          >
            {satellite.isCurated ? "Curated" : "Custom"}
          </Badge>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="rounded-md border-zinc-300 bg-zinc-50 px-2 text-xs font-semibold text-zinc-700"
            >
              {satellite.category ?? "uncategorised"}
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="rounded-md border-zinc-300 bg-white px-2 text-xs font-semibold text-zinc-600"
                >
                  Subscription ready
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Can be added to group subscriptions.
              </TooltipContent>
            </Tooltip>
          </div>
          {satellite.description ? (
            <p className="text-sm leading-6 text-zinc-600">
              {satellite.description}
            </p>
          ) : (
            <p className="text-sm leading-6 text-zinc-600">
              Validated satellite record. Can be added to group subscriptions.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
