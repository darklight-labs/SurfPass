"use client"

import { useActionState } from "react"
import { Loader2, Users } from "lucide-react"

import { createGroupAction } from "@/app/(app)/groups/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { initialGroupActionState } from "@/lib/groups/types"

export function CreateGroupForm() {
  const [state, formAction, isPending] = useActionState(
    createGroupAction,
    initialGroupActionState
  )

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-md border border-zinc-200 bg-white p-5"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label
            htmlFor="name"
            className="text-xs font-semibold uppercase text-zinc-500"
          >
            Group name
          </Label>
          <Input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={80}
            placeholder="Cape Town Evening Spotters"
            className="rounded-md border-zinc-300 bg-white"
          />
        </div>
        <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 size-4 text-zinc-500" />
            <p className="text-sm leading-6 text-zinc-600">
              The creator becomes group owner and can add the first shared
              satellite subscriptions.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="description"
          className="text-xs font-semibold uppercase text-zinc-500"
        >
          Description
        </Label>
        <Textarea
          id="description"
          name="description"
          maxLength={300}
          placeholder="Evening visual passes and occasional FM satellite work."
          className="min-h-28 rounded-md border-zinc-300 bg-white"
        />
      </div>

      {state.message ? (
        <Alert className="rounded-md border-red-200 bg-red-50 text-red-950">
          <AlertTitle>Group creation failed</AlertTitle>
          <AlertDescription className="text-red-900">
            {state.message}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" className="rounded-md" disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Users className="size-4" />
          )}
          Create group
        </Button>
      </div>
    </form>
  )
}
