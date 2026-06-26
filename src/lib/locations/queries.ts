import "server-only"

import { EnvValidationError } from "@/lib/env"
import { requireUser } from "@/lib/auth/guards"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type { SavedLocationViewModel } from "@/types/domain"

type LocationRow = Database["public"]["Tables"]["locations"]["Row"]

type SavedLocationsResult = {
  locations: SavedLocationViewModel[]
  error?: string
}

function mapLocationRow(row: LocationRow): SavedLocationViewModel {
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    elevationM: row.elevation_m,
    timezone: row.timezone,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getSavedLocations(): Promise<SavedLocationsResult> {
  try {
    const user = await requireUser()
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from("locations")
      .select(
        "id,user_id,name,label,latitude,longitude,elevation_m,timezone,country,is_default,created_at,updated_at"
      )
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      return {
        locations: [],
        error: error.message,
      }
    }

    return {
      locations: (data ?? []).map(mapLocationRow),
    }
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return {
        locations: [],
        error:
          "Supabase environment variables are required to load saved locations.",
      }
    }

    throw error
  }
}

export async function getSavedLocationCount(): Promise<number | null> {
  try {
    const user = await requireUser()
    const supabase = await createServerSupabaseClient()
    const { count, error } = await supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)

    if (error) {
      return null
    }

    return count ?? 0
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return null
    }

    throw error
  }
}
