import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { getSupabasePublicConfig } from "@/lib/env"
import type { Database } from "@/types/database"

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabasePublicConfig()

    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value)
            })

            response = NextResponse.next({
              request,
            })

            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    await supabase.auth.getUser()
  } catch {
    // Missing local Supabase config should not break public routes. Server-side
    // guards still redirect protected routes to login and login actions explain
    // the missing env configuration.
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
