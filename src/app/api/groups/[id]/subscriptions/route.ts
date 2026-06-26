import { getCurrentUser } from "@/lib/auth/guards"
import { getGroupDetail } from "@/lib/groups/queries"
import { uuidSchema } from "@/lib/validation/schemas"

export const dynamic = "force-dynamic"

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const parsedGroupId = uuidSchema.safeParse(id)

  if (!parsedGroupId.success) {
    return jsonError("Group id is invalid.", 400)
  }

  const user = await getCurrentUser()

  if (!user) {
    return jsonError("Sign in to read group subscriptions.", 401)
  }

  const result = await getGroupDetail(parsedGroupId.data)

  if (result.error) {
    return jsonError(result.error, 503)
  }

  if (!result.group) {
    return jsonError("Group was not found or is not available to this user.", 404)
  }

  return Response.json({
    group: result.group,
    subscriptions: result.subscriptions,
  })
}

export async function POST() {
  return Response.json(
    {
      error:
        "JSON subscription writes are not exposed yet. Use the authenticated group detail form, which persists through a Supabase server action.",
    },
    { status: 501 }
  )
}
