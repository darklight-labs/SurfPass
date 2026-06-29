import { z } from "zod"

const nonEmptyString = z.string().trim().min(1)
const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).optional()
)
const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().url().optional()
)

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: nonEmptyString,
  NEXT_PUBLIC_APP_URL: optionalUrl.default("http://localhost:3000"),
})

const serverEnvSchema = publicEnvSchema.extend({
  APP_BASE_URL: optionalUrl,
  SUPABASE_SERVICE_ROLE_KEY: optionalNonEmptyString,
  N2YO_API_KEY: optionalNonEmptyString,
  RESEND_API_KEY: optionalNonEmptyString,
  RESEND_FROM_EMAIL: optionalNonEmptyString,
  ALERT_FROM_EMAIL: optionalNonEmptyString,
  CRON_SECRET: optionalNonEmptyString,
  TEST_ALERT_EMAIL: optionalNonEmptyString,
})

const supabaseAdminEnvSchema = serverEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: nonEmptyString,
})

export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EnvValidationError"
  }
}

type EnvSource = Record<string, string | undefined>

export type PublicEnv = z.infer<typeof publicEnvSchema>
export type ServerEnv = z.infer<typeof serverEnvSchema>

function parseEnv<T>(
  schema: z.ZodType<T>,
  source: EnvSource,
  label: string
): T {
  const parsed = schema.safeParse(source)

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ")
    throw new EnvValidationError(`${label} validation failed: ${details}`)
  }

  return parsed.data
}

export function getPublicEnv(source: EnvSource = process.env): PublicEnv {
  return parseEnv(publicEnvSchema, source, "Public environment")
}

export function getServerEnv(source: EnvSource = process.env): ServerEnv {
  return parseEnv(serverEnvSchema, source, "Server environment")
}

export function getSupabasePublicConfig() {
  const env = getPublicEnv()

  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

export function getSupabaseAdminConfig() {
  const env = parseEnv(
    supabaseAdminEnvSchema,
    process.env,
    "Supabase admin environment"
  )

  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  }
}

export function getAppBaseUrl() {
  const env = getServerEnv()
  return env.APP_BASE_URL ?? env.NEXT_PUBLIC_APP_URL
}

export function getAlertEnv() {
  const env = getServerEnv()
  const fromEmail = env.RESEND_FROM_EMAIL ?? env.ALERT_FROM_EMAIL

  if (!env.RESEND_API_KEY) {
    throw new EnvValidationError(
      "RESEND_API_KEY is required when sending alert email."
    )
  }

  if (!fromEmail) {
    throw new EnvValidationError(
      "RESEND_FROM_EMAIL or ALERT_FROM_EMAIL is required when sending alert email."
    )
  }

  return {
    resendApiKey: env.RESEND_API_KEY,
    fromEmail,
  }
}

export function getCronSecret(source: EnvSource = process.env) {
  const cronSecret = source.CRON_SECRET?.trim()

  if (!cronSecret) {
    throw new EnvValidationError(
      "CRON_SECRET is required for the scheduled alert route."
    )
  }

  return cronSecret
}

export function getTestAlertEmail() {
  const env = getServerEnv()

  if (!env.TEST_ALERT_EMAIL) {
    throw new EnvValidationError(
      "TEST_ALERT_EMAIL is required for the manual test alert route."
    )
  }

  const parsed = z.string().trim().email().safeParse(env.TEST_ALERT_EMAIL)

  if (!parsed.success) {
    throw new EnvValidationError(
      "TEST_ALERT_EMAIL must be a valid email address."
    )
  }

  return parsed.data
}

export function getN2yoEnv() {
  const env = getServerEnv()

  if (!env.N2YO_API_KEY) {
    throw new EnvValidationError(
      "N2YO_API_KEY is required when validating NORAD IDs."
    )
  }

  return {
    n2yoApiKey: env.N2YO_API_KEY,
  }
}
