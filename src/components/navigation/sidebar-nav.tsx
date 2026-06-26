"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  MapPin,
  Satellite,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Locations", href: "/locations", icon: MapPin },
  { label: "Satellites", href: "/satellites", icon: Satellite },
  { label: "Groups", href: "/groups", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
]

type SidebarNavProps = {
  orientation?: "sidebar" | "top"
  className?: string
}

export function SidebarNav({
  orientation = "sidebar",
  className,
}: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary navigation"
      className={cn(
        orientation === "top"
          ? "flex gap-1 overflow-x-auto"
          : "flex flex-col gap-1",
        className
      )}
    >
      {navItems.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href))
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex h-10 items-center gap-3 rounded-md border border-transparent px-3 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-950",
              orientation === "top" && "h-9 shrink-0 px-2.5 text-xs",
              active && "border-zinc-900 bg-zinc-950 text-white hover:bg-zinc-950 hover:text-white"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
