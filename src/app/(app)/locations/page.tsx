import { AlertTriangle, MapPin } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { LocationSearchForm } from "@/components/forms/location-search-form"
import { SavedLocationsList } from "@/components/locations/saved-locations-list"
import { PageHeader } from "@/components/surface/page-header"
import { SectionBlock } from "@/components/surface/section-block"
import { getSavedLocations } from "@/lib/locations/queries"

export const dynamic = "force-dynamic"

export default async function LocationsPage() {
  const { locations, error } = await getSavedLocations()

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Observer setup"
        title="Locations"
        description="Save the places you watch or work satellites from."
        meta={
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="rounded-md border-zinc-300 bg-white px-2.5 text-xs font-semibold uppercase text-zinc-600"
            >
              WGS84 coordinates
            </Badge>
            <Badge
              variant="outline"
              className="rounded-md border-zinc-300 bg-white px-2.5 text-xs font-semibold uppercase text-zinc-600"
            >
              {locations.length} saved
            </Badge>
          </div>
        }
      />

      {error ? (
        <Alert className="rounded-md border-red-200 bg-red-50 text-red-950">
          <AlertTriangle className="size-4" />
          <AlertTitle>Saved locations unavailable</AlertTitle>
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      ) : null}

      <SectionBlock
        label="Search"
        title="Find observer site"
        description="Search is routed through SurfPass, then normalized before any location is saved."
      >
        <LocationSearchForm />
      </SectionBlock>

      <SectionBlock
        label="Saved sites"
        title="Observer locations"
        description="These records are stored in Supabase and owned by the signed-in user."
        action={
          <Badge
            variant="outline"
            className="rounded-md border-zinc-300 bg-white px-2.5 text-xs font-semibold uppercase text-zinc-600"
          >
            <MapPin className="size-3" />
            {locations.length} records
          </Badge>
        }
      >
        <SavedLocationsList locations={locations} />
      </SectionBlock>
    </div>
  )
}
