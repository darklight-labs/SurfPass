#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../src/types/database"

const { existsSync, readFileSync } = require("node:fs") as typeof import("node:fs")
const { resolve } = require("node:path") as typeof import("node:path")
const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js")

type AdminClient = SupabaseClient<Database>
type SupabaseResult = {
  data: unknown
  error: { message: string } | null
}
type ReviewerLocationRow = {
  id: string
  name: string
  label: string | null
  latitude: number
  longitude: number
}
type ReviewerGroupRow = {
  id: string
  name: string
  description: string | null
}
type ReviewerSatelliteRow = {
  id: string
  norad_id: number
  name: string
}
type ReviewerSubscriptionRow = {
  id: string
  pass_type: "visual" | "radio"
  satellite_id: string
}
type ReviewerAlertPreferenceRow = {
  id: string
  email_enabled: boolean
  lead_minutes: number
}
type ReviewerMembershipRow = {
  group_id: string
  user_id: string
  role: "owner" | "member"
}

const REVIEWER_LOCATIONS = [
  {
    name: "Cape Town",
    label: "Cape Town / Signal Hill",
    latitude: -33.9258,
    longitude: 18.4232,
    elevation_m: 25,
    timezone: "Africa/Johannesburg",
    country: "South Africa",
    is_default: true,
  },
  {
    name: "Johannesburg",
    label: "Johannesburg / Observatory",
    latitude: -26.2041,
    longitude: 28.0473,
    elevation_m: 1753,
    timezone: "Africa/Johannesburg",
    country: "South Africa",
    is_default: false,
  },
]

const REVIEWER_GROUP = {
  name: "Cape Town Evening Spotters",
  description:
    "Shared watch list for useful visual and radio satellite passes around Cape Town.",
}

const REQUIRED_SATELLITES = [
  {
    norad_id: 25544,
    name: "ISS",
    category: "visual/radio",
    description:
      "International Space Station. Useful for bright visual passes and amateur radio activity.",
    is_curated: true,
  },
  {
    norad_id: 27607,
    name: "SO-50",
    category: "amateur radio",
    description: "SaudiSat-1C amateur radio FM satellite.",
    is_curated: true,
  },
]

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseDotEnvValue(value: string) {
  const trimmed = value.trim()

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function parseDotEnvFile(filename: string) {
  const filepath = resolve(process.cwd(), filename)

  if (!existsSync(filepath)) {
    return {}
  }

  return readFileSync(filepath, "utf8")
    .split(/\r?\n/)
    .reduce<Record<string, string>>((acc, line) => {
      const trimmed = line.trim()

      if (!trimmed || trimmed.startsWith("#")) {
        return acc
      }

      const equalsIndex = trimmed.indexOf("=")

      if (equalsIndex === -1) {
        return acc
      }

      const key = trimmed.slice(0, equalsIndex).trim()
      const value = trimmed.slice(equalsIndex + 1)

      if (key) {
        acc[key] = parseDotEnvValue(value)
      }

      return acc
    }, {})
}

function loadLocalEnv() {
  const fileEnv = {
    ...parseDotEnvFile(".env"),
    ...parseDotEnvFile(".env.local"),
  }

  Object.entries(fileEnv).forEach(([key, value]) => {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  })
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is required for reviewer data seeding.`)
  }

  return value
}

function validateUrl(value: string, label: string) {
  try {
    return new URL(value).toString()
  } catch {
    throw new Error(`${label} must be a valid URL.`)
  }
}

async function expectSingle<T>(
  promise: PromiseLike<SupabaseResult>,
  label: string
) {
  const { data, error } = await promise

  if (error) {
    throw new Error(`${label}: ${error.message}`)
  }

  if (!data) {
    throw new Error(`${label}: no row returned.`)
  }

  return data as T
}

async function expectRows<T>(
  promise: PromiseLike<SupabaseResult>,
  label: string
) {
  const { data, error } = await promise

  if (error) {
    throw new Error(`${label}: ${error.message}`)
  }

  return (Array.isArray(data) ? data : []) as T[]
}

async function ensureProfile(admin: AdminClient, reviewerUserId: string) {
  const { data, error } = await admin.auth.admin.getUserById(reviewerUserId)

  if (error) {
    throw new Error(`Auth user could not be loaded: ${error.message}`)
  }

  if (!data.user?.email) {
    throw new Error(
      "Auth user is missing an email. Create the reviewer account in Supabase Auth first."
    )
  }

  await expectSingle<{ id: string }>(
    admin
      .from("profiles")
      .upsert(
        {
          id: reviewerUserId,
          email: data.user.email,
          full_name:
            typeof data.user.user_metadata.full_name === "string"
              ? data.user.user_metadata.full_name
              : "SurfPass Reviewer",
        },
        { onConflict: "id" }
      )
      .select("id")
      .single(),
    "Reviewer profile could not be upserted"
  )

  return data.user.email
}

async function upsertReviewerLocation(
  input: {
    admin: AdminClient
    reviewerUserId: string
    location: (typeof REVIEWER_LOCATIONS)[number]
  }
) {
  const existingLocations = await expectRows<{ id: string }>(
    input.admin
      .from("locations")
      .select("id")
      .eq("user_id", input.reviewerUserId)
      .eq("label", input.location.label)
      .limit(1),
    "Reviewer location could not be checked"
  )

  const existing = existingLocations.at(0)

  if (existing) {
    return expectSingle<ReviewerLocationRow>(
      input.admin
        .from("locations")
        .update(input.location)
        .eq("id", existing.id)
        .select("id,name,label,latitude,longitude")
        .single(),
      "Reviewer location could not be updated"
    )
  }

  return expectSingle<ReviewerLocationRow>(
    input.admin
      .from("locations")
      .insert({
        user_id: input.reviewerUserId,
        ...input.location,
      })
      .select("id,name,label,latitude,longitude")
      .single(),
    "Reviewer location could not be inserted"
  )
}

async function ensureReviewerLocations(
  admin: AdminClient,
  reviewerUserId: string
) {
  await expectRows<{ id: string }>(
    admin
      .from("locations")
      .update({ is_default: false })
      .eq("user_id", reviewerUserId)
      .select("id"),
    "Existing default locations could not be cleared"
  )

  const locations: ReviewerLocationRow[] = []

  for (const location of REVIEWER_LOCATIONS) {
    locations.push(
      await upsertReviewerLocation({
        admin,
        reviewerUserId,
        location,
      })
    )
  }

  return locations
}

async function ensureReviewerGroup(admin: AdminClient, reviewerUserId: string) {
  const existingGroups = await expectRows<{ id: string }>(
    admin
      .from("groups")
      .select("id")
      .eq("owner_id", reviewerUserId)
      .eq("name", REVIEWER_GROUP.name)
      .limit(1),
    "Reviewer group could not be checked"
  )

  const existing = existingGroups.at(0)

  if (existing) {
    const group = await expectSingle<ReviewerGroupRow>(
      admin
        .from("groups")
        .update(REVIEWER_GROUP)
        .eq("id", existing.id)
        .select("id,name,description")
        .single(),
      "Reviewer group could not be updated"
    )

    await ensureOwnerMembership(admin, group.id, reviewerUserId)
    return group
  }

  const group = await expectSingle<ReviewerGroupRow>(
    admin
      .from("groups")
      .insert({
        owner_id: reviewerUserId,
        ...REVIEWER_GROUP,
      })
      .select("id,name,description")
      .single(),
    "Reviewer group could not be inserted"
  )

  await ensureOwnerMembership(admin, group.id, reviewerUserId)
  return group
}

async function ensureOwnerMembership(
  admin: AdminClient,
  groupId: string,
  reviewerUserId: string
) {
  return expectSingle<ReviewerMembershipRow>(
    admin
      .from("group_members")
      .upsert(
        {
          group_id: groupId,
          user_id: reviewerUserId,
          role: "owner",
        },
        { onConflict: "group_id,user_id" }
      )
      .select("group_id,user_id,role")
      .single(),
    "Reviewer owner membership could not be upserted"
  )
}

async function ensureRequiredSatellites(admin: AdminClient) {
  const satellites = await expectRows<ReviewerSatelliteRow>(
    admin
      .from("satellites")
      .upsert(REQUIRED_SATELLITES, { onConflict: "norad_id" })
      .select("id,norad_id,name"),
    "Required satellites could not be upserted"
  )

  const byNoradId = new Map(satellites.map((satellite) => [satellite.norad_id, satellite]))

  REQUIRED_SATELLITES.forEach((satellite) => {
    if (!byNoradId.has(satellite.norad_id)) {
      throw new Error(`Satellite ${satellite.norad_id} was not returned after upsert.`)
    }
  })

  return byNoradId
}

async function ensureSubscriptions(input: {
  admin: AdminClient
  groupId: string
  locationId: string
  issSatelliteId: string
}) {
  return expectRows<ReviewerSubscriptionRow>(
    input.admin
      .from("group_subscriptions")
      .upsert(
        [
          {
            group_id: input.groupId,
            location_id: input.locationId,
            satellite_id: input.issSatelliteId,
            pass_type: "radio",
            min_elevation: 10,
            min_visibility_seconds: 120,
            days_ahead: 10,
            alerts_enabled: true,
          },
          {
            group_id: input.groupId,
            location_id: input.locationId,
            satellite_id: input.issSatelliteId,
            pass_type: "visual",
            min_elevation: 30,
            min_visibility_seconds: 120,
            days_ahead: 10,
            alerts_enabled: true,
          },
        ],
        { onConflict: "group_id,location_id,satellite_id,pass_type" }
      )
      .select("id,pass_type,satellite_id"),
    "Reviewer group subscriptions could not be upserted"
  )
}

async function ensureAlertPreference(
  admin: AdminClient,
  reviewerUserId: string,
  groupId: string
) {
  return expectSingle<ReviewerAlertPreferenceRow>(
    admin
      .from("alert_preferences")
      .upsert(
        {
          user_id: reviewerUserId,
          group_id: groupId,
          email_enabled: true,
          lead_minutes: 30,
        },
        { onConflict: "user_id,group_id" }
      )
      .select("id,email_enabled,lead_minutes")
      .single(),
    "Reviewer alert preference could not be upserted"
  )
}

async function main() {
  loadLocalEnv()

  const supabaseUrl = validateUrl(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    "NEXT_PUBLIC_SUPABASE_URL"
  )
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  const reviewerUserId = requiredEnv("REVIEWER_USER_ID")

  if (!UUID_PATTERN.test(reviewerUserId)) {
    throw new Error("REVIEWER_USER_ID must be a Supabase Auth user UUID.")
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const reviewerEmail = await ensureProfile(admin, reviewerUserId)
  const locations = await ensureReviewerLocations(admin, reviewerUserId)
  const primaryLocation = locations[0]

  if (!primaryLocation) {
    throw new Error("Reviewer locations were not available.")
  }

  const group = await ensureReviewerGroup(admin, reviewerUserId)
  const satellitesByNoradId = await ensureRequiredSatellites(admin)
  const iss = satellitesByNoradId.get(25544)

  if (!iss) {
    throw new Error("Required reviewer satellites were not available.")
  }

  const subscriptions = await ensureSubscriptions({
    admin,
    groupId: group.id,
    locationId: primaryLocation.id,
    issSatelliteId: iss.id,
  })
  const alertPreference = await ensureAlertPreference(
    admin,
    reviewerUserId,
    group.id
  )

  console.log("Reviewer seed data is ready.")
  console.log("")
  console.log(`Reviewer email: ${reviewerEmail}`)
  console.log(
    `Locations: ${locations
      .map((location) => `${location.label ?? location.name} (${location.id})`)
      .join(", ")}`
  )
  console.log(`Group: ${group.name} (${group.id})`)
  console.log(`Subscriptions: ${subscriptions.length}`)
  console.log(
    `Alert preference: email=${alertPreference.email_enabled}, lead=${alertPreference.lead_minutes} minutes`
  )
  console.log("")
  console.log("Next steps:")
  console.log("1. Sign in with the reviewer account.")
  console.log(
    `2. Open /groups/${group.id} and confirm ISS radio uses 10° / 10 days.`
  )
  console.log("3. Click Refresh passes and use an ISS radio card for RSVP.")
  console.log("4. Use /settings to confirm email alerts are enabled.")
  console.log("5. Use /api/alerts/test after pass refresh to verify Resend.")
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Reviewer data seeding failed."
  )
  process.exit(1)
})
