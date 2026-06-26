import Link from "next/link"
import {
  ArrowRight,
  Bell,
  Satellite,
  Users,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-semibold leading-none">
            SurfPass
          </Link>
          <Badge
            variant="outline"
            className="rounded-md border-zinc-300 bg-white px-2.5 text-xs font-semibold uppercase text-zinc-600"
          >
            Assessment build
          </Badge>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="max-w-5xl">
          <p className="mb-5 text-xs font-semibold uppercase text-zinc-500">
            Satellite pass operations
          </p>
          <h1 className="max-w-5xl text-5xl font-semibold leading-none text-zinc-950 md:text-7xl">
            Catch the next good satellite pass before it passes you.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-600">
            SurfPass helps radio operators and satellite spotters coordinate
            around short, location-specific pass windows.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="rounded-md">
              <Link href="/dashboard">
                Enter dashboard
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-md bg-white">
              <Link href="#assumptions">Read assumptions</Link>
            </Button>
          </div>
        </div>

        <div className="grid border-y border-zinc-200 bg-white md:grid-cols-3">
          <LandingPillar
            icon={Satellite}
            title="Forecast"
            body="Live pass data becomes a ranked group forecast."
          />
          <LandingPillar
            icon={Users}
            title="Coordinate"
            body="Groups share subscriptions, RSVP state, and readiness."
          />
          <LandingPillar
            icon={Bell}
            title="Alert"
            body="Email reminders help the group act before the window opens."
          />
        </div>

        <section
          id="assumptions"
          className="grid gap-4 border-t border-zinc-200 pt-6 md:grid-cols-[220px_1fr]"
        >
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Assumptions
            </p>
          </div>
          <div className="grid gap-4 text-sm leading-6 text-zinc-600 md:grid-cols-3">
            <p>
              SurfPass is a coordination app, not a map-first tracker. Pass
              cards carry the core workflow.
            </p>
            <p>
              Group subscriptions are the centre of shared state. RSVP comes
              before chat.
            </p>
            <p>
              Provider data must be cached and failures should degrade to
              clearly labeled stale data where possible.
            </p>
          </div>
        </section>
      </section>
    </main>
  )
}

function LandingPillar({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon
  title: string
  body: string
}) {
  return (
    <div className="border-zinc-200 p-6 md:border-r md:last:border-r-0">
      <Icon className="mb-8 size-5 text-zinc-500" />
      <h2 className="text-xl font-semibold text-zinc-950">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{body}</p>
    </div>
  )
}
