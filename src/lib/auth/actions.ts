"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { EnvValidationError, getAppBaseUrl } from "@/lib/env"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export type AuthMode = "sign-in" | "sign-up"

export type AuthFormState = {
  mode: AuthMode
  status?: "error" | "success"
  message?: string
  errors?: {
    email?: string[]
    password?: string[]
  }
}

const authFormSchema = z.object({
  mode: z.enum(["sign-in", "sign-up"]),
  email: z.email("Enter a valid email address.").trim(),
  password: z.string().min(6, "Password must be at least 6 characters."),
})

export async function authenticateWithPassword(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const validated = authFormSchema.safeParse({
    mode: formData.get("mode"),
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!validated.success) {
    const fallbackMode =
      formData.get("mode") === "sign-up" ? "sign-up" : "sign-in"

    return {
      mode: fallbackMode,
      status: "error",
      errors: validated.error.flatten().fieldErrors,
      message: "Check the highlighted fields and try again.",
    }
  }

  const { mode, email, password } = validated.data
  let shouldRedirectToDashboard = false

  try {
    if (mode === "sign-in") {
      await signInWithEmailPassword(email, password)
      shouldRedirectToDashboard = true
    } else {
      const hasSession = await signUpWithEmailPassword(email, password)
      shouldRedirectToDashboard = hasSession
    }
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return {
        mode,
        status: "error",
        message:
          "Supabase environment variables are not configured for auth yet.",
      }
    }

    if (error instanceof Error) {
      return {
        mode,
        status: "error",
        message: error.message,
      }
    }

    return {
      mode,
      status: "error",
      message: "Authentication failed.",
    }
  }

  if (shouldRedirectToDashboard) {
    redirect("/dashboard")
  }

  return {
    mode,
    status: "success",
    message: "Account created. Check email for confirmation, then sign in.",
  }
}

export async function signInWithEmailPassword(
  email: string,
  password: string
) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function signUpWithEmailPassword(
  email: string,
  password: string
) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAppBaseUrl()}/dashboard`,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  return Boolean(data.session)
}

export async function signOut() {
  try {
    const supabase = await createServerSupabaseClient()
    await supabase.auth.signOut()
  } catch (error) {
    if (!(error instanceof EnvValidationError)) {
      throw error
    }
  }

  redirect("/")
}
