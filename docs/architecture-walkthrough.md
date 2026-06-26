# SurfPass Architecture Walkthrough

## Product Interpretation

SurfPass treats satellite passes as short waves of opportunity: predictable, local, temporary, and only useful when the pass is good enough to act on. The product is therefore a coordination console, not a decorative tracker. It helps a group define what it watches, refresh a shared forecast, decide who is going, and receive deduplicated email alerts before the window opens.

## System Overview

SurfPass uses the Next.js App Router with Server Components by default and Client Components only for forms, RSVP controls, and small interactive actions. Supabase provides email/password Auth, Postgres, and RLS for user-owned locations, group membership, shared subscriptions, cached predictions, RSVP state, and alert records.

Provider integrations are server-side. Open-Meteo Geocoding normalises observer location search. N2YO provides TLE validation plus visual and radio pass predictions. Sunrise-Sunset enriches refreshed pass predictions with daylight/twilight context, but it is not a second authority for whether a visual pass is valid. Resend sends email alerts. Vercel Cron invokes the scheduled alert worker. `pass_predictions` caches normalised provider data, and `notification_deliveries` is the durable per-pass dedupe record.

## Core Data Model

- `profiles`: one row per Supabase Auth user.
- `locations`: user-owned observer sites with latitude, longitude, elevation, timezone, and default flag.
- `satellites`: globally readable catalogue records keyed by NORAD ID.
- `groups`: shared coordination spaces.
- `group_members`: owner/member roster for group access.
- `group_subscriptions`: shared watch definitions connecting group, location, satellite, pass type, thresholds, and alert intent.
- `pass_predictions`: cached N2YO pass windows, normalised and scored for app use.
- `pass_rsvps`: structured readiness state per group/pass/user.
- `alert_preferences`: per-user, per-group email alert settings and lead time.
- `notification_deliveries`: pending/sent/failed email delivery records used for dedupe.
- `api_fetch_logs`: provider, cron, and reliability diagnostics.

## Why `group_subscriptions` Is The Centre

`group_subscriptions` is the shared-state centre because it models the coordination object directly:

- who: the group
- where: the observer location
- what: the satellite
- mode: visual or radio
- quality: minimum elevation or visibility thresholds
- alert intent: enabled or disabled

This keeps SurfPass from becoming a personal satellite lookup. Users coordinate around shared watch definitions, then pass predictions, RSVPs, and alerts attach to those definitions.

## Pass Refresh Flow

1. The authenticated group member clicks refresh on a group page.
2. The route verifies group membership.
3. The server loads the group subscriptions.
4. For each subscription, SurfPass checks `pass_predictions` for fresh cache.
5. N2YO is called only when cache is missing or stale.
6. Provider payloads are normalised into the SurfPass pass shape.
7. Passes are scored as `excellent`, `good`, or `low`.
8. Sunrise-Sunset enrichment is attempted for daylight/twilight labels and degrades to `unknown` if unavailable.
9. Predictions are upserted into `pass_predictions` by stable cache key.
10. Provider success or failure is logged in `api_fetch_logs`.
11. The group page displays pass cards from cached database state.

## Alert Flow

1. Vercel Cron calls `GET /api/cron/alerts`.
2. The route requires `Authorization: Bearer ${CRON_SECRET}`.
3. The worker scans cached `pass_predictions` only; it never calls N2YO.
4. It matches passes against alert-enabled subscriptions and user alert preferences.
5. It selects passes within each user's lead-time window.
6. It claims `notification_deliveries` rows as `pending` per user/group/pass/channel/lead time.
7. It groups claimed passes into email digests by user, group, channel, and lead time.
8. Resend sends the digest email.
9. Each pass delivery row is marked `sent` only after Resend accepts the message.
10. Repeated cron runs dedupe on `notification_deliveries` and do not spam users.

Manual test alerts remain single-pass so the reviewer can explicitly prove one pass notification path.

## Failure Handling

- N2YO failure: show stale cache when available, otherwise return a clear provider warning.
- Sunrise-Sunset failure: keep the pass refresh successful and show unknown light context.
- Resend failure: release pending claims and do not mark deliveries as sent.
- Missing env vars: return clear setup errors when the affected operation runs.
- Duplicate subscription: rely on the database unique constraint and show a graceful UI error.
- Duplicate alert: dedupe through `notification_deliveries`.
- No pass data: render empty states that point to the next action.

## UI Decision

SurfPass uses a Swiss operational console style: strong typography, thin borders, restrained colour, tabular data, compact cards, and clear state labels. Pass cards come before maps because the first operational questions are when the pass starts, whether it is visual or radio, how good it is, where it moves, who is going, whether alerts are ready, and whether the data is live, cached, or stale.

The lightweight timeline, direction arc, and max elevation indicator make a pass understandable without orbital expertise. The app avoids decorative space wallpaper, neon, fake 3D, and generic sci-fi dashboard tropes.

## Deliberately Not Built

- Full chat.
- Full satellite catalogue browsing.
- Map-first tracker.
- SMS, WhatsApp, or push notifications.
- Weather/cloud-cover scoring.
- Doppler correction or rig control.
- Full invite links and member self-service.

## Production Hardening With More Time

- Queue-backed alert worker with retry/backoff.
- Stale pending-claim cleanup for email delivery.
- Invite links and richer member management.
- Weather/cloud-cover enrichment.
- Frequency and mode catalogue for amateur radio satellites.
- Map and sky-plot views after pass cards remain the primary workflow.
- Admin observability for provider, cron, and delivery health.
