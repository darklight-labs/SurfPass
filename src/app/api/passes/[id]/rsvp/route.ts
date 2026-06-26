import { revalidatePath } from "next/cache"
import type { NextRequest } from "next/server"

import { getCurrentUser } from "@/lib/auth/guards"
import { upsertRsvpForUser } from "@/lib/rsvps/service"
import { rsvpSchema } from "@/lib/validation/schemas"

export const dynamic = "force-dynamic"

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()

  if (!user) {
    return jsonError("Sign in to RSVP.", 401)
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  const parsed = rsvpSchema.safeParse({
    groupId: body?.groupId,
    passPredictionId: id,
    status: body?.status,
    note: body?.note,
  })

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "RSVP details are invalid.",
      400
    )
  }

  const result = await upsertRsvpForUser({
    userId: user.id,
    groupId: parsed.data.groupId,
    passPredictionId: parsed.data.passPredictionId,
    status: parsed.data.status,
    note: parsed.data.note,
  })

  if (!result.ok) {
    return jsonError(result.message, 403)
  }

  revalidatePath(`/groups/${parsed.data.groupId}`)
  revalidatePath("/dashboard")

  return Response.json(result)
}
