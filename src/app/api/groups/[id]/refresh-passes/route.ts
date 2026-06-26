import { revalidatePath } from "next/cache"
import type { NextRequest } from "next/server"

import { getCurrentUser } from "@/lib/auth/guards"
import { EnvValidationError } from "@/lib/env"
import { refreshPassesForGroup } from "@/lib/passes/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { uuidSchema } from "@/lib/validation/schemas"

export const dynamic = "force-dynamic"

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const parsedGroupId = uuidSchema.safeParse(id)

  if (!parsedGroupId.success) {
    return jsonError("Group id is invalid.", 400)
  }

  const user = await getCurrentUser()

  if (!user) {
    return jsonError("Sign in to refresh group passes.", 401)
  }

  const supabase = await createServerSupabaseClient()
  const { data: membership, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id,user_id,role,created_at")
    .eq("group_id", parsedGroupId.data)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError) {
    return jsonError("Group membership could not be verified.", 503)
  }

  if (!membership) {
    return jsonError("Only group members can refresh pass data.", 403)
  }

  try {
    const summary = await refreshPassesForGroup(parsedGroupId.data)

    revalidatePath(`/groups/${parsedGroupId.data}`)
    revalidatePath("/dashboard")

    return Response.json(summary)
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return jsonError(
        "Supabase service role is not configured, so pass predictions cannot be refreshed.",
        503
      )
    }

    return jsonError("Pass refresh failed before provider data was cached.", 503)
  }
}
