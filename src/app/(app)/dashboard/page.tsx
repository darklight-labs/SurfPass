import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  MapPin,
  Satellite,
  Users,
  type LucideIcon,
} from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PassCard } from "@/components/data-display/pass-card"
import { EmptyState } from "@/components/feedback/empty-state"
import { StaleCacheAlert } from "@/components/feedback/stale-cache-alert"
import { MetricCard } from "@/components/surface/metric-card"
import { PageHeader } from "@/components/surface/page-header"
import { SectionBlock } from "@/components/surface/section-block"
import { SwissGrid } from "@/components/surface/swiss-grid"
import { requireUser } from "@/lib/auth/guards"
import {
  getDashboardSummary,
  type DashboardSummary,
} from "@/lib/dashboard/queries"

type Metric = {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  href?: string
  tone?: "neutral" | "good" | "warn" | "critical"
}

function formatDateTime(value?: string) {
  if (!value) {
    return "No forecast"
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value))
}

function buildMetrics(summary: DashboardSummary): Metric[] {
  return [
    {
      label: "Saved locations",
      value: String(summary.locationCount),
      detail: "Observer sites available for pass predictions.",
      icon: MapPin,
      href: "/locations",
      tone: summary.locationCount > 0 ? "neutral" : "warn",
    },
    {
      label: "Groups watching",
      value: String(summary.groupCount),
      detail: "Joined coordination spaces.",
      icon: Users,
      href: "/groups",
      tone: summary.groupCount > 0 ? "neutral" : "warn",
    },
    {
      label: "Subscriptions",
      value: String(summary.subscriptionCount),
      detail: "Shared satellite, location, and pass-type watches.",
      icon: Satellite,
      href: "/groups",
      tone: summary.subscriptionCount > 0 ? "neutral" : "warn",
    },
    {
      label: "Upcoming passes",
      value: String(summary.upcomingPassCount),
      detail: "Cached future pass predictions across your groups.",
      icon: CalendarClock,
      href: "/groups",
      tone: summary.upcomingPassCount > 0 ? "good" : "warn",
    },
  ]
}

function buildChecklist(summary: DashboardSummary) {
  return [
    {
      label: "Saved location exists",
      description: "At least one observer location is stored.",
      complete: summary.locationCount > 0,
      href: "/locations",
    },
    {
      label: "Group exists",
      description: "You have a shared coordination space.",
      complete: summary.groupCount > 0,
      href: "/groups",
    },
    {
      label: "Subscription exists",
      description: "A group is watching a satellite from a location.",
      complete: summary.subscriptionCount > 0,
      href: "/groups",
    },
    {
      label: "Pass forecast exists",
      description: "Cached N2YO predictions are available.",
      complete: summary.upcomingPassCount > 0,
      href: "/groups",
    },
  ]
}

export default async function DashboardPage() {
  const user = await requireUser()
  const summary = await getDashboardSummary(user.id)
  const metrics = buildMetrics(summary)
  const checklist = buildChecklist(summary)
  const dataState = summary.nextPass?.dataState ?? "unavailable"

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SurfPass forecast"
        title="Dashboard"
        description="Your next satellite pass windows, group readiness, and alert status."
        actions={
          <>
            <Button asChild className="rounded-md">
              <Link href="/groups">
                <Users className="size-4" />
                Open groups
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-md bg-white">
              <Link href="/locations">
                <MapPin className="size-4" />
                Add location
              </Link>
            </Button>
          </>
        }
        meta={
          <Badge
            variant="outline"
            className="rounded-md border-zinc-300 bg-white px-2.5 text-xs font-semibold uppercase text-zinc-600"
          >
            Cached database overview
          </Badge>
        }
      />

      <SectionBlock
        label="Next good pass"
        title="Primary operating window"
        description="Selected from cached pass predictions across your joined groups. The dashboard never calls N2YO directly."
      >
        {summary.nextPass ? (
          <PassCard
            {...summary.nextPass}
            className="border-zinc-300 shadow-[0_1px_0_rgba(24,24,27,0.04)]"
          />
        ) : (
          <EmptyState
            title="No forecast yet"
            description="Add a location, create a group subscription, then refresh passes from a group page."
            icon={<CalendarClock className="size-5" />}
            action={
              <div className="flex flex-wrap gap-2">
                <Button asChild className="rounded-md">
                  <Link href="/groups">
                    <Users className="size-4" />
                    Open groups
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-md bg-white">
                  <Link href="/locations">
                    <MapPin className="size-4" />
                    Add location
                  </Link>
                </Button>
              </div>
            }
          />
        )}
      </SectionBlock>

      <SectionBlock label="Operational metrics" title="Current readiness">
        <SwissGrid columns="three" className="lg:grid-cols-4">
          {metrics.map((metric) => {
            const card = (
              <MetricCard
                label={metric.label}
                value={metric.value}
                detail={metric.detail}
                tone={metric.tone}
                icon={metric.icon}
              />
            )

            return metric.href ? (
              <Link
                key={metric.label}
                href={metric.href}
                className="block rounded-md transition-colors hover:bg-zinc-100"
              >
                {card}
              </Link>
            ) : (
              <div key={metric.label}>{card}</div>
            )
          })}
        </SwissGrid>
      </SectionBlock>

      <SwissGrid columns="dashboard">
        <SectionBlock
          label="Group readiness"
          title="Joined groups"
          description="Group subscriptions are the shared watch state behind the pass feed."
        >
          {summary.groups.length === 0 ? (
            <EmptyState
              title="No groups yet"
              description="Create or join a group before SurfPass can build a shared pass feed."
              icon={<Users className="size-5" />}
              action={
                <Button asChild className="rounded-md">
                  <Link href="/groups">
                    <Users className="size-4" />
                    Open groups
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead>Subscriptions</TableHead>
                    <TableHead>Upcoming passes</TableHead>
                    <TableHead>Next forecast</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>
                        <p className="font-medium text-zinc-950">
                          {group.name}
                        </p>
                      </TableCell>
                      <TableCell>{group.subscriptionCount}</TableCell>
                      <TableCell>{group.upcomingPassCount}</TableCell>
                      <TableCell>{formatDateTime(group.nextPassStartUtc)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="rounded-md bg-white"
                        >
                          <Link href={`/groups/${group.id}`}>
                            <ArrowRight className="size-4" />
                            Open
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionBlock>

        <SectionBlock
          label="Data state"
          title="Provider cache"
          description="Dashboard reads cached pass predictions only. Refreshes happen from group pages."
        >
          <div className="space-y-4">
            <StaleCacheAlert
              dataState={dataState}
              fetchedAt={summary.nextPass?.fetchedAt}
              title={
                dataState === "unavailable"
                  ? "No cached forecast data yet"
                  : undefined
              }
              description={
                dataState === "unavailable"
                  ? "Forecast data appears after refreshing passes from a group page."
                  : undefined
              }
            />

            {summary.dataWarnings.length > 0 ? (
              <Alert className="rounded-md border-amber-200 bg-amber-50 text-amber-950">
                <AlertTriangle className="size-4" />
                <AlertTitle>Data warnings</AlertTitle>
                <AlertDescription className="text-amber-900">
                  {summary.dataWarnings.join(" ")}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </SectionBlock>
      </SwissGrid>

      <SectionBlock
        label="Setup checklist"
        title="Operating loop"
        description="These steps turn the dashboard into a real cached pass overview."
      >
        <div className="grid gap-3 md:grid-cols-4">
          {checklist.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-md border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Step {index + 1}
                </p>
                {item.complete ? (
                  <CheckCircle2 className="size-4 text-emerald-700" />
                ) : (
                  <Circle className="size-4 text-zinc-400" />
                )}
              </div>
              <h3 className="mt-5 text-base font-semibold leading-tight text-zinc-950">
                {item.label}
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </SectionBlock>

      <div className="rounded-md border border-dashed border-zinc-300 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Cache discipline
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              This dashboard reads Supabase state only. Use a group detail page
              to refresh N2YO pass predictions.
            </p>
          </div>
          <Badge
            variant="outline"
            className="w-fit rounded-md border-zinc-300 bg-zinc-50 px-2.5 text-xs font-semibold uppercase text-zinc-600"
          >
            No provider call on render
          </Badge>
        </div>
      </div>
    </div>
  )
}
