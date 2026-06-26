import { z } from "zod"

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value
    }

    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  },
  z.string().min(1).max(160).optional()
)

const latitudeSchema = z.number().min(-90).max(90)
const longitudeSchema = z.number().min(-180).max(180)

export const geocodeQuerySchema = z
  .string()
  .trim()
  .min(2, "Search query must be at least 2 characters.")
  .max(100, "Search query must be 100 characters or fewer.")

export const geocodeSearchParamsSchema = z.object({
  q: geocodeQuerySchema,
})

export const geocodedLocationOptionSchema = z.object({
  providerId: z.union([z.number(), z.string().min(1)]),
  name: z.string().trim().min(1).max(160),
  country: optionalTrimmedString,
  admin1: optionalTrimmedString,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  elevationM: z.number().optional(),
  timezone: optionalTrimmedString,
})

export const saveLocationSchema = geocodedLocationOptionSchema.extend({
  isDefault: z.boolean().optional().default(false),
})

export const uuidSchema = z.string().uuid()
export const locationIdSchema = uuidSchema

export const noradIdSchema = z
  .number()
  .int("NORAD ID must be an integer.")
  .positive("NORAD ID must be positive.")
  .max(999999, "NORAD ID is outside the supported range.")

export const customSatelliteLookupSchema = z.object({
  noradId: noradIdSchema,
})

const optionalDescriptionSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value
    }

    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  },
  z.string().max(300, "Description must be 300 characters or fewer.").optional()
)

const formNumberSchema = (fallback: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return fallback
    }

    if (typeof value === "string") {
      return Number(value)
    }

    return value
  }, z.number())

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Group name must be at least 2 characters.")
    .max(80, "Group name must be 80 characters or fewer."),
  description: optionalDescriptionSchema,
})

export const createGroupSubscriptionSchema = z.object({
  groupId: z.string().uuid(),
  locationId: z.string().uuid(),
  satelliteId: z.string().uuid(),
  passType: z.enum(["visual", "radio"]),
  minElevation: formNumberSchema(30)
    .pipe(z.number().int().min(0).max(90))
    .default(30),
  minVisibilitySeconds: formNumberSchema(120)
    .pipe(z.number().int().min(0).max(3600))
    .default(120),
  daysAhead: formNumberSchema(7).pipe(z.number().int().min(1).max(10)).default(7),
  alertsEnabled: z.boolean().default(true),
})

export const rsvpSchema = z.object({
  groupId: z.string().uuid(),
  passPredictionId: z.string().uuid(),
  status: z.enum(["going", "maybe", "skipping"]),
  note: optionalTrimmedString,
})

export const updateAlertPreferenceSchema = z.object({
  groupId: z.string().uuid(),
  emailEnabled: z.boolean(),
  leadMinutes: formNumberSchema(30)
    .pipe(z.number().int().min(5).max(1440))
    .default(30),
})

export const manualAlertTestSchema = z.object({
  groupId: z.string().uuid(),
  passPredictionId: z.string().uuid(),
  leadMinutes: z.number().int().min(5).max(1440).optional(),
})
