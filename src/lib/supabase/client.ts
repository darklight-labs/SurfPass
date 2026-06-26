"use client"

import { createBrowserClient } from "@supabase/ssr"

import { getSupabasePublicConfig } from "@/lib/env"
import type { Database } from "@/types/database"

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicConfig()

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

export const createBrowserSupabaseClient = createClient
