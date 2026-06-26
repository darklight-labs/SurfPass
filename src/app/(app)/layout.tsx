import type { ReactNode } from "react"

import { requireUser } from "@/lib/auth/guards"
import { AppShell } from "@/components/surface/app-shell"

export const dynamic = "force-dynamic"

export default async function ProtectedAppLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await requireUser()

  return <AppShell userEmail={user.email}>{children}</AppShell>
}
