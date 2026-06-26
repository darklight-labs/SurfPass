"use client"

import { useActionState, useMemo, useState, type ComponentProps } from "react"
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"

import {
  authenticateWithPassword,
  type AuthFormState,
  type AuthMode,
} from "@/lib/auth/actions"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const initialState: AuthFormState = {
  mode: "sign-in",
}

export function LoginForm() {
  const [mode, setMode] = useState<AuthMode>("sign-in")
  const [state, action, pending] = useActionState(
    authenticateWithPassword,
    initialState
  )

  const visibleState = useMemo(() => {
    return state.mode === mode ? state : undefined
  }, [mode, state])

  const isSignIn = mode === "sign-in"

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 rounded-md border border-zinc-200 bg-zinc-50 p-1">
        <ModeButton
          active={isSignIn}
          onClick={() => setMode("sign-in")}
          disabled={pending}
        >
          Sign in
        </ModeButton>
        <ModeButton
          active={!isSignIn}
          onClick={() => setMode("sign-up")}
          disabled={pending}
        >
          Sign up
        </ModeButton>
      </div>

      {visibleState?.message ? (
        <Alert
          variant={visibleState.status === "error" ? "destructive" : "default"}
          className="rounded-md border-zinc-200 bg-white"
        >
          {visibleState.status === "success" ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <AlertTriangle className="size-4" />
          )}
          <AlertTitle>
            {visibleState.status === "success"
              ? "Account created"
              : "Authentication issue"}
          </AlertTitle>
          <AlertDescription>{visibleState.message}</AlertDescription>
        </Alert>
      ) : null}

      <form action={action} className="space-y-4">
        <input type="hidden" name="mode" value={mode} />

        <div className="space-y-2">
          <Label htmlFor="email" className="text-zinc-950">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-md border-zinc-200 bg-white"
            aria-invalid={Boolean(visibleState?.errors?.email)}
          />
          {visibleState?.errors?.email ? (
            <p className="text-sm text-red-700">
              {visibleState.errors.email[0]}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-zinc-950">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignIn ? "current-password" : "new-password"}
            required
            minLength={6}
            className="rounded-md border-zinc-200 bg-white"
            aria-invalid={Boolean(visibleState?.errors?.password)}
          />
          {visibleState?.errors?.password ? (
            <p className="text-sm text-red-700">
              {visibleState.errors.password[0]}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full rounded-md" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isSignIn ? "Sign in" : "Create account"}
        </Button>
      </form>
    </div>
  )
}

function ModeButton({
  active,
  className,
  ...props
}: ComponentProps<"button"> & { active: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "h-9 rounded-sm px-3 text-sm font-medium text-zinc-600 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        active && "bg-white text-zinc-950 shadow-sm",
        className
      )}
      {...props}
    />
  )
}
