"use server"

import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/auth/guards"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  locationIdSchema,
  saveLocationSchema,
} from "@/lib/validation/schemas"

type LocationActionResult = {
  ok: boolean
  message: string
}

function actionError(message: string): LocationActionResult {
  return {
    ok: false,
    message,
  }
}

function actionSuccess(message: string): LocationActionResult {
  return {
    ok: true,
    message,
  }
}

function revalidateLocationSurfaces() {
  revalidatePath("/locations")
  revalidatePath("/dashboard")
}

export async function saveLocationAction(
  input: unknown
): Promise<LocationActionResult> {
  const user = await getCurrentUser()

  if (!user) {
    return actionError("Sign in with configured Supabase credentials to save locations.")
  }

  const parsed = saveLocationSchema.safeParse(input)

  if (!parsed.success) {
    return actionError(
      parsed.error.issues[0]?.message ?? "Location data is invalid."
    )
  }

  const location = parsed.data
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("locations")
    .insert({
      user_id: user.id,
      name: location.name,
      label: location.admin1 ?? null,
      latitude: location.latitude,
      longitude: location.longitude,
      elevation_m: location.elevationM ?? 0,
      timezone: location.timezone ?? null,
      country: location.country ?? null,
      is_default: false,
    })
    .select("id")
    .single()

  if (error) {
    return actionError(error.message)
  }

  if (location.isDefault) {
    const defaultResult = await setDefaultLocationAction(data.id)

    if (!defaultResult.ok) {
      revalidateLocationSurfaces()
      return actionError(
        `Location saved, but default update failed: ${defaultResult.message}`
      )
    }
  }

  revalidateLocationSurfaces()
  return actionSuccess(
    location.isDefault ? "Location saved as default." : "Location saved."
  )
}

export async function setDefaultLocationAction(
  id: unknown
): Promise<LocationActionResult> {
  const user = await getCurrentUser()

  if (!user) {
    return actionError("Sign in to set a default location.")
  }

  const parsed = locationIdSchema.safeParse(id)

  if (!parsed.success) {
    return actionError("Location id is invalid.")
  }

  const supabase = await createServerSupabaseClient()
  const { data: existing, error: lookupError } = await supabase
    .from("locations")
    .select("id")
    .eq("id", parsed.data)
    .eq("user_id", user.id)
    .maybeSingle()

  if (lookupError) {
    return actionError(lookupError.message)
  }

  if (!existing) {
    return actionError("Location was not found for the current user.")
  }

  const { error: clearError } = await supabase
    .from("locations")
    .update({ is_default: false })
    .eq("user_id", user.id)

  if (clearError) {
    return actionError(clearError.message)
  }

  const { error: defaultError } = await supabase
    .from("locations")
    .update({ is_default: true })
    .eq("id", parsed.data)
    .eq("user_id", user.id)

  if (defaultError) {
    return actionError(defaultError.message)
  }

  revalidateLocationSurfaces()
  return actionSuccess("Default location updated.")
}

export async function deleteLocationAction(
  id: unknown
): Promise<LocationActionResult> {
  const user = await getCurrentUser()

  if (!user) {
    return actionError("Sign in to delete locations.")
  }

  const parsed = locationIdSchema.safeParse(id)

  if (!parsed.success) {
    return actionError("Location id is invalid.")
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from("locations")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", user.id)

  if (error) {
    return actionError(error.message)
  }

  revalidateLocationSurfaces()
  return actionSuccess("Location deleted.")
}
