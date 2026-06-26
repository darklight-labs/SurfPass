import { AlertTriangle, Satellite } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { SatelliteLookupForm } from "@/components/forms/satellite-lookup-form"
import { SatelliteCatalogue } from "@/components/satellites/satellite-catalogue"
import { PageHeader } from "@/components/surface/page-header"
import { SectionBlock } from "@/components/surface/section-block"
import { getSatelliteCatalogue } from "@/lib/satellites/queries"

export const dynamic = "force-dynamic"

const recommendedNoradOrder = [25544, 20580, 28654, 33591, 43017, 27607]

export default async function SatellitesPage() {
  const { satellites, error } = await getSatelliteCatalogue()
  const curatedCount = satellites.filter((satellite) => satellite.isCurated).length
  const customCount = satellites.length - curatedCount
  const recommendedSatellites = satellites
    .filter(
      (satellite) =>
        satellite.isCurated && recommendedNoradOrder.includes(satellite.noradId)
    )
    .sort(
      (a, b) =>
        recommendedNoradOrder.indexOf(a.noradId) -
        recommendedNoradOrder.indexOf(b.noradId)
    )

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Watch list"
        title="Satellites"
        description="Choose the objects your group wants to forecast."
        meta={
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="rounded-md border-zinc-300 bg-white px-2.5 text-xs font-semibold uppercase text-zinc-600"
            >
              {curatedCount} curated
            </Badge>
            <Badge
              variant="outline"
              className="rounded-md border-zinc-300 bg-white px-2.5 text-xs font-semibold uppercase text-zinc-600"
            >
              {customCount} custom
            </Badge>
          </div>
        }
      />

      {error ? (
        <Alert className="rounded-md border-red-200 bg-red-50 text-red-950">
          <AlertTriangle className="size-4" />
          <AlertTitle>Satellite catalogue unavailable</AlertTitle>
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      ) : null}

      <SectionBlock
        label="Custom lookup"
        title="Advanced NORAD lookup"
        description="Use this when a satellite is not already in the curated list."
      >
        <SatelliteLookupForm recommendedSatellites={recommendedSatellites} />
      </SectionBlock>

      <SectionBlock
        label="Catalogue"
        title="Forecastable objects"
        description="Curated MVP records plus any custom satellites validated through N2YO."
        action={
          <Badge
            variant="outline"
            className="rounded-md border-zinc-300 bg-white px-2.5 text-xs font-semibold uppercase text-zinc-600"
          >
            <Satellite className="size-3" />
            {satellites.length} records
          </Badge>
        }
      >
        <SatelliteCatalogue satellites={satellites} />
      </SectionBlock>
    </div>
  )
}
