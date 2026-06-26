import "server-only"

import { createClient } from "@supabase/supabase-js"

import { getSupabaseAdminConfig } from "@/lib/env"
import type { Database } from "@/types/database"

export function createAdminSupabaseClient() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseAdminConfig()

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
