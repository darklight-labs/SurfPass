import type { ReactNode } from "react"
import Link from "next/link"

import { SidebarNav } from "@/components/navigation/sidebar-nav"
import { signOut } from "@/lib/auth/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AppShellProps = {
  children: ReactNode
  userEmail?: string | null
  className?: string
}

export function AppShell({ children, userEmail, className }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#f7f6f2] text-zinc-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-zinc-200 px-5 py-5">
          <Link href="/dashboard" className="block">
            <p className="text-xl font-semibold leading-none text-zinc-950">
              SurfPass
            </p>
            <p className="mt-2 text-xs font-semibold uppercase text-zinc-500">
              Pass operations
            </p>
          </Link>
        </div>
        <div className="flex flex-1 flex-col justify-between p-3">
          <SidebarNav />
          <div className="border-t border-zinc-200 pt-4">
            <p className="text-xs font-semibold uppercase text-zinc-500">Signed in</p>
            <p className="mt-2 truncate text-sm font-medium text-zinc-950">
              {userEmail ?? "Supabase user"}
            </p>
            <form action={signOut} className="mt-4">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="w-full rounded-md bg-white"
              >
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/dashboard" className="shrink-0">
              <span className="text-lg font-semibold text-zinc-950">
                SurfPass
              </span>
            </Link>
            <span className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold uppercase text-zinc-500">
              Signed in
            </span>
          </div>
          <div className="border-t border-zinc-200 px-4 py-2">
            <div className="flex items-center gap-3">
              <SidebarNav orientation="top" className="min-w-0 flex-1" />
              <form action={signOut}>
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="rounded-md bg-white"
                >
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </header>

        <main
          className={cn(
            "mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10",
            className
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
