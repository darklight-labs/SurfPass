"use client"

import { useActionState } from "react"
import { AlertTriangle, Bell, Loader2, Radio } from "lucide-react"

import { createGroupSubscriptionAction } from "@/app/(app)/groups/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { initialGroupActionState } from "@/lib/groups/types"
import type {
  GroupRole,
  SatelliteCatalogueItem,
  SavedLocationViewModel,
} from "@/types/domain"

type GroupSubscriptionFormProps = {
  groupId: string
  currentUserRole: GroupRole
  locations: SavedLocationViewModel[]
  satellites: SatelliteCatalogueItem[]
}

export function GroupSubscriptionForm({
  groupId,
  currentUserRole,
  locations,
  satellites,
}: GroupSubscriptionFormProps) {
  const [state, formAction, isPending] = useActionState(
    createGroupSubscriptionAction,
    initialGroupActionState
  )
  const missingOptions = locations.length === 0 || satellites.length === 0
  const disabled = isPending || missingOptions || currentUserRole !== "owner"

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-md border border-zinc-200 bg-white p-5"
    >
      <input type="hidden" name="groupId" value={groupId} />

      {currentUserRole !== "owner" ? (
        <Alert className="rounded-md border-amber-200 bg-amber-50 text-amber-950">
          <AlertTriangle className="size-4" />
          <AlertTitle>Owner action</AlertTitle>
          <AlertDescription className="text-amber-900">
            Group owners manage shared watch definitions in this assessment build.
          </AlertDescription>
        </Alert>
      ) : null}

      {missingOptions ? (
        <Alert className="rounded-md border-amber-200 bg-amber-50 text-amber-950">
          <AlertTriangle className="size-4" />
          <AlertTitle>Setup required</AlertTitle>
          <AlertDescription className="text-amber-900">
            Save at least one observer location and ensure the satellite
            catalogue has seeded records before adding subscriptions.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-zinc-500">
            Observer location
          </Label>
          <Select
            name="locationId"
            defaultValue={locations[0]?.id}
            disabled={disabled}
          >
            <SelectTrigger className="w-full rounded-md border-zinc-300 bg-white">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent className="rounded-md">
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.label ?? location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-zinc-500">
            Satellite
          </Label>
          <Select
            name="satelliteId"
            defaultValue={satellites[0]?.id}
            disabled={disabled}
          >
            <SelectTrigger className="w-full rounded-md border-zinc-300 bg-white">
              <SelectValue placeholder="Select satellite" />
            </SelectTrigger>
            <SelectContent className="rounded-md">
              {satellites.map((satellite) => (
                <SelectItem key={satellite.id} value={satellite.id}>
                  {satellite.name} · NORAD {satellite.noradId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-zinc-500">
            Pass type
          </Label>
          <Select name="passType" defaultValue="visual" disabled={disabled}>
            <SelectTrigger className="w-full rounded-md border-zinc-300 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-md">
              <SelectItem value="visual">Visual</SelectItem>
              <SelectItem value="radio">Radio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <NumericField
          name="minElevation"
          label="Min elevation"
          defaultValue={30}
          min={0}
          max={90}
          disabled={disabled}
        />
        <NumericField
          name="minVisibilitySeconds"
          label="Min visibility"
          defaultValue={120}
          min={0}
          max={3600}
          disabled={disabled}
        />
        <NumericField
          name="daysAhead"
          label="Days ahead"
          defaultValue={7}
          min={1}
          max={10}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 size-4 text-zinc-500" />
          <div>
            <p className="text-sm font-medium text-zinc-950">Alerts enabled</p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Email reminders can run when this subscription and member
              preferences are both enabled.
            </p>
          </div>
        </div>
        <Switch name="alertsEnabled" defaultChecked disabled={disabled} />
      </div>

      {state.message ? (
        <Alert
          className={
            state.ok
              ? "rounded-md border-emerald-200 bg-emerald-50 text-emerald-950"
              : "rounded-md border-red-200 bg-red-50 text-red-950"
          }
        >
          <AlertTitle>
            {state.ok ? "Subscription added" : "Subscription failed"}
          </AlertTitle>
          <AlertDescription
            className={state.ok ? "text-emerald-900" : "text-red-900"}
          >
            {state.message}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" className="rounded-md" disabled={disabled}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Radio className="size-4" />
          )}
          Add subscription
        </Button>
      </div>
    </form>
  )
}

function NumericField({
  name,
  label,
  defaultValue,
  min,
  max,
  disabled,
}: {
  name: string
  label: string
  defaultValue: number
  min: number
  max: number
  disabled: boolean
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={name}
        className="text-xs font-semibold uppercase text-zinc-500"
      >
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type="number"
        min={min}
        max={max}
        defaultValue={defaultValue}
        disabled={disabled}
        className="rounded-md border-zinc-300 bg-white"
      />
    </div>
  )
}
