# SurfPass Assumptions

## Authentication

SurfPass uses Supabase email/password authentication for the MVP.

The public landing page is available without an account. Operational app routes such as dashboard, groups, locations, satellites, and settings require an authenticated Supabase user.

Local development requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to exercise the auth flow. If those values are absent, protected routes redirect to login and auth submissions return a clear configuration error.

Service-role access is server-only. It is used for provider-cache writes, custom satellite upserts, manual delivery records, and the scheduled alert worker.

## Locations

Observer locations are stored as WGS84 latitude and longitude with elevation in metres.

Open-Meteo Geocoding is the MVP provider for place search. The browser calls SurfPass `/api/geocode`, and the route handler calls Open-Meteo server-side before returning normalized candidates.

If Open-Meteo does not return elevation, SurfPass stores `0` metres. This keeps pass-provider requests well formed while making the fallback explicit.

## Catalogue

The MVP starts with a seeded curated satellite catalogue: ISS, Hubble, NOAA 18, NOAA 19, SO-50, and AO-91. Custom NORAD lookup can add more satellites later, but the seeded set keeps the initial product focused on useful visual, weather, and amateur-radio passes.

Custom NORAD lookup validates through the N2YO TLE endpoint when `N2YO_API_KEY` is configured. Full catalogue browsing and live satellite positions are out of MVP scope.

## Pass Engine

Visual passes are N2YO `visualpasses` results for a saved observer location, satellite, and minimum visibility threshold. Magnitude is used when N2YO returns a meaningful value.

Radio passes are N2YO `radiopasses` results for a saved observer location, satellite, and minimum elevation threshold.

Pass scoring is intentionally simple for the MVP: excellent passes have strong elevation and duration, good passes clear useful operating thresholds, and low passes remain visible but are less worth acting on. Visual scoring also rewards brighter magnitude when available.

N2YO cache freshness is six hours. Fresh cache is reused without spending provider transactions; stale cache can still be displayed when a live refresh fails.

The group pass feed is card-first rather than map-first. Users need to know when the next useful window opens, how good it is, and whether the group is prepared before they need a map or sky plot.

Sunrise-Sunset is enrichment only. It adds daylight, night, civil twilight, nautical twilight, astronomical twilight, or unknown labels to cached pass predictions during refresh. N2YO remains the source of truth for visual pass prediction, and daylight context does not decide whether a pass is valid.

If Sunrise-Sunset fails, pass refresh still succeeds. The affected pass cards show unknown light context, and the provider failure can be logged for later debugging.

## Dashboard

The dashboard is an overview, not the refresh engine. It reads cached Supabase state for locations, groups, subscriptions, and pass predictions.

The dashboard does not call N2YO. Users refresh provider data from a group detail page, and the resulting cached predictions are then summarized on the dashboard.

When no cached pass predictions exist, the dashboard should show an empty forecast state and direct the user back to locations, groups, subscriptions, and group refresh.

## Groups

Groups are shared coordination spaces. The database creates owner membership automatically when a group is inserted. MVP group invites may be seeded or managed manually until invite links are implemented.

Group subscription writes are restricted to group owners in the initial RLS policy set. This is a conservative simplification until explicit member permissions are modelled.

The MVP owner/member model exists now, but invite links and member self-service are future scope. For assessment data, group memberships may be preloaded manually.

`group_subscriptions` is the shared-state centre: group plus location plus satellite plus pass type plus thresholds. Duplicate subscriptions are prevented by the database unique constraint on group, location, satellite, and pass type.

## RSVP

RSVP is a readiness signal for a specific group/pass, not formal event registration.

Each group member can store one RSVP per pass: going, maybe, or skipping. Updating readiness overwrites the prior row through the unique group, pass, and user constraint.

RSVP is intentionally structured state. Chat, attendee management, and rich discussion threads remain out of MVP scope.

## Alerting

Email is the MVP alert channel. SMS and WhatsApp are out of scope.

Alert preferences are per user and per group. Missing preferences default to `email_enabled=true` and `lead_minutes=30`, and the settings page lets users persist those values.

Group subscriptions provide subscription-level alert intent through `alerts_enabled`. A disabled subscription is treated as skipped for pass-card alert state.

Notification delivery records are the source of truth for sent alert state. Only rows with `status='sent'` are treated as delivered in pass cards. The unique key across user, group, pass prediction, channel, and lead time is modelled so repeated manual or cron runs can avoid duplicate sends.

Manual test alerts are available through `POST /api/alerts/test`. The route requires an authenticated user, sends only to that user's Supabase Auth email address, verifies group membership, claims a pending delivery row, and marks it sent only after Resend accepts the email.

Scheduled alerts run through `GET /api/cron/alerts`, protected by `Authorization: Bearer ${CRON_SECRET}` and configured in `vercel.json` for a 15 minute interval.

The cron worker reads cached `pass_predictions` only. Pass refresh and alerting are separate responsibilities, so scheduled delivery does not spend N2YO transactions or hide stale provider data behind background fetches.

The manual route and cron worker claim a `notification_deliveries` row with `status='pending'` before calling Resend, then mark it `sent` only after provider acceptance. Pass cards only treat `status='sent'` rows as delivered. The unique delivery key and Resend idempotency reduce duplicate-send risk under overlapping requests.

Scheduled alerts are batched into email digests by user, group, channel, and lead time. The digest may contain multiple pass windows, but `notification_deliveries` remains one row per user, group, pass, channel, and lead time.

Manual test alerts remain single-pass emails because they are meant to prove one pass alert path explicitly.

If Resend accepts an email but the follow-up database update fails, a pending claim may remain and block retries for that user/pass/lead time until manually inspected. A stale-claim cleanup job is future production hardening.
