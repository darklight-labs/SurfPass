import {
  CalendarClock,
  Eye,
  Radio,
  Satellite,
  Timer,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DaylightBadge } from "@/components/data-display/daylight-badge"
import { ElevationIndicator } from "@/components/data-display/elevation-indicator"
import { PassAlertStateBadge } from "@/components/data-display/pass-alert-state-badge"
import { PassScoreBadge } from "@/components/data-display/pass-score-badge"
import { PassSkyArc } from "@/components/data-display/pass-sky-arc"
import { PassTimeline } from "@/components/data-display/pass-timeline"
import { RsvpControl } from "@/components/data-display/rsvp-control"
import { RsvpSummary } from "@/components/data-display/rsvp-summary"
import {
  formatDuration,
  formatElevation,
  formatMagnitude,
} from "@/lib/utils/formatting"
import { formatFetchedAt, formatTimeRange } from "@/lib/utils/dates"
import { cn } from "@/lib/utils"
import { operationalStates, typeStates } from "@/styles/design-tokens"
import type { DataState, PassCardViewModel, PassType } from "@/types/domain"

export type PassCardProps = Omit<PassCardViewModel, "fetchedAt"> & {
  fetchedAt?: string | Date
  recordLabel?: string
  className?: string
}

const passTypeLabel: Record<PassType, string> = {
  visual: "Visual pass",
  radio: "Radio pass",
}

const dataLabel: Record<DataState, string> = {
  live: "Live",
  cached: "Cached",
  stale: "Stale",
  unavailable: "Missing",
}

export function PassCard({
  groupId,
  passPredictionId,
  satelliteName,
  passType,
  groupName,
  localStart,
  localMax,
  localEnd,
  maxElevation,
  startAzCompass,
  maxAzCompass,
  endAzCompass,
  directionSummary,
  durationSeconds,
  magnitude,
  score,
  daylightLabel,
  rsvpGoingCount,
  rsvpMaybeCount,
  rsvpSkippingCount,
  currentUserRsvp,
  currentUserNote,
  alertState,
  dataState,
  fetchedAt,
  recordLabel,
  className,
}: PassCardProps) {
  const PassIcon = passType === "visual" ? Eye : Radio
  const formattedMagnitude = formatMagnitude(magnitude)
  const facts = [
    { label: "Max elevation", value: formatElevation(maxElevation) },
    { label: "Best moment", value: localMax },
    { label: "Ends", value: localEnd },
    { label: "Duration", value: formatDuration(durationSeconds) },
    ...(formattedMagnitude
      ? [{ label: "Magnitude", value: formattedMagnitude }]
      : []),
  ]

  return (
    <Card
      className={cn(
        "rounded-md border-zinc-200 bg-white shadow-none",
        className
      )}
    >
      <CardHeader className="gap-4 border-b border-zinc-200">
        <div className="flex flex-wrap items-center gap-2">
          {recordLabel ? (
            <Badge
              variant="outline"
              className="h-6 rounded-md border-zinc-300 bg-white px-2 text-xs font-semibold uppercase text-zinc-600"
            >
              {recordLabel}
            </Badge>
          ) : null}
          <Badge
            variant="outline"
            className={cn(
              "h-6 rounded-md border px-2 text-xs font-semibold",
              typeStates[passType]
            )}
          >
            <PassIcon className="size-3" />
            {passTypeLabel[passType]}
          </Badge>
          <PassScoreBadge score={score} />
          <DaylightBadge label={daylightLabel} passType={passType} />
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="min-w-0">
            <CardTitle className="flex min-w-0 items-center gap-3 text-3xl font-semibold leading-none text-zinc-950">
              <Satellite className="size-6 text-zinc-500" />
              <span className="min-w-0 break-words">{satelliteName}</span>
            </CardTitle>
            <p className="mt-3 text-sm font-medium text-zinc-600">
              {groupName}
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Starts
            </p>
            <p className="mt-1 text-3xl font-semibold leading-none text-zinc-950">
              {localStart}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-5">
          {facts.map((fact) => (
            <Stat key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </div>

        <div className="grid gap-3">
          <PassTimeline
            localStart={localStart}
            localMax={localMax}
            localEnd={localEnd}
            durationSeconds={durationSeconds}
          />
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <PassSkyArc
              startAzCompass={startAzCompass}
              maxAzCompass={maxAzCompass}
              endAzCompass={endAzCompass}
              directionSummary={directionSummary}
              maxElevation={maxElevation}
            />
            <ElevationIndicator maxElevation={maxElevation} score={score} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
              <CalendarClock className="size-4 text-zinc-500" />
              <span>{formatTimeRange(localStart, localEnd)}</span>
              <span className="text-zinc-300">/</span>
              <span>Peak at {localMax}</span>
            </div>
          </div>
          <RsvpSummary
            goingCount={rsvpGoingCount}
            maybeCount={rsvpMaybeCount}
            currentUserRsvp={currentUserRsvp}
          />
        </div>

        <Separator />

        {groupId && passPredictionId ? (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                Group readiness
              </p>
              {rsvpSkippingCount ? (
                <span className="text-xs text-zinc-500">
                  {rsvpSkippingCount} skipping
                </span>
              ) : null}
            </div>
            <RsvpControl
              groupId={groupId}
              passPredictionId={passPredictionId}
              currentUserRsvp={currentUserRsvp}
              currentUserNote={currentUserNote}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4">
          <PassAlertStateBadge state={alertState} />
          <Badge
            variant="outline"
            className={cn(
              "h-7 rounded-md border px-2.5 text-xs font-semibold",
              operationalStates[dataState]
            )}
          >
            <Timer className="size-3" />
            {dataLabel[dataState]}
          </Badge>
          <span className="text-xs text-zinc-500">
            {fetchedAt
              ? `Fetched ${formatFetchedAt(fetchedAt)}`
              : "No provider fetch recorded"}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-zinc-200 pl-3">
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-semibold leading-none text-zinc-950">
        {value}
      </p>
    </div>
  )
}
