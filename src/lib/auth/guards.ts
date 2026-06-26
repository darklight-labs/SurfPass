import "server-only"

import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"

import { EnvValidationError } from "@/lib/env"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      return null
    }

    return user
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return null
    }

    throw error
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return user
}

export async function redirectAuthenticatedUser(path = "/dashboard") {
  const user = await getCurrentUser()

  if (user) {
    redirect(path)
  }
}
