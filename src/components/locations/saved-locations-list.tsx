import { MapPin } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { LocationCard } from "@/components/locations/location-card"
import type { SavedLocationViewModel } from "@/types/domain"

type SavedLocationsListProps = {
  locations: SavedLocationViewModel[]
}

export function SavedLocationsList({ locations }: SavedLocationsListProps) {
  if (locations.length === 0) {
    return (
      <EmptyState
        title="No saved observer locations"
        description="Search for a place, review the coordinates, then save it as an operating site for future pass forecasts."
        icon={<MapPin className="size-5" />}
      />
    )
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {locations.map((location) => (
        <LocationCard key={location.id} location={location} />
      ))}
    </div>
  )
}
