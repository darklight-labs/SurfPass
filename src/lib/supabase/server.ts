import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { getSupabasePublicConfig } from "@/lib/env"
import type { Database } from "@/types/database"

export async function createServerSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicConfig()
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot set cookies. The request proxy refreshes
          // sessions, and Server Actions/Route Handlers can still write them.
        }
      },
    },
  })
}
