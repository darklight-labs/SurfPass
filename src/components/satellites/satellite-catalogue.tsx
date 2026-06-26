import { Satellite } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { SatelliteCard } from "@/components/satellites/satellite-card"
import type { SatelliteCatalogueItem } from "@/types/domain"

type SatelliteCatalogueProps = {
  satellites: SatelliteCatalogueItem[]
}

export function SatelliteCatalogue({ satellites }: SatelliteCatalogueProps) {
  if (satellites.length === 0) {
    return (
      <EmptyState
        title="No satellites in the catalogue"
        description="Apply the Supabase seed file to load the curated MVP watch list, or add a custom NORAD ID when N2YO is configured."
        icon={<Satellite className="size-5" />}
      />
    )
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {satellites.map((satellite) => (
        <SatelliteCard key={satellite.id} satellite={satellite} />
      ))}
    </div>
  )
}
