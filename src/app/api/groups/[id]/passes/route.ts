import { getCurrentUser } from "@/lib/auth/guards"
import { getGroupPassFeed } from "@/lib/passes/queries"
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
    return jsonError("Sign in to read group pass data.", 401)
  }

  const result = await getGroupPassFeed(parsedGroupId.data)

  if (result.error) {
    return jsonError(result.error, 503)
  }

  return Response.json(result)
}
