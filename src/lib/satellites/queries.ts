import "server-only"

import { EnvValidationError } from "@/lib/env"
import { requireUser } from "@/lib/auth/guards"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type { SatelliteCatalogueItem } from "@/types/domain"

type SatelliteRow = Database["public"]["Tables"]["satellites"]["Row"]

type SatelliteCatalogueResult = {
  satellites: SatelliteCatalogueItem[]
  error?: string
}

export function mapSatelliteRow(row: SatelliteRow): SatelliteCatalogueItem {
  return {
    id: row.id,
    noradId: row.norad_id,
    name: row.name,
    category: row.category,
    description: row.description,
    isCurated: row.is_curated,
  }
}

export async function getSatelliteCatalogue(): Promise<SatelliteCatalogueResult> {
  try {
    await requireUser()

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from("satellites")
      .select(
        "id,norad_id,name,category,description,is_curated,created_at,updated_at"
      )
      .order("is_curated", { ascending: false })
      .order("name", { ascending: true })

    if (error) {
      return {
        satellites: [],
        error: error.message,
      }
    }

    return {
      satellites: (data ?? []).map(mapSatelliteRow),
    }
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return {
        satellites: [],
        error:
          "Supabase environment variables are required to load the satellite catalogue.",
      }
    }

    throw error
  }
}
