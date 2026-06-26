# SurfPass

Satellite pass coordination and alerting platform for amateur radio operators and satellite spotters.

SurfPass helps users know when satellites are visible or contactable from their saved locations, coordinate around useful passes with groups, RSVP to upcoming windows, and prepare deduplicated email alerts before the pass begins.

## Live URL

https://surf-pass.vercel.app

GitHub repository: https://github.com/darklight-labs/SurfPass

## Test account

Email: `reviewer@surfpass.app`

Password: `SurfPassReview!2026`

This is a disposable reviewer account with seeded SurfPass data. Reviewer data setup is documented in [docs/test-account-setup.md](docs/test-account-setup.md), and the final non-secret validation checklist is in [docs/reviewer-account-validation.md](docs/reviewer-account-validation.md).

## APIs used

- Supabase - email/password auth, Postgres, RLS-protected shared state, and server-side admin operations where client writes are intentionally blocked.
- N2YO - TLE validation for custom NORAD lookup, visual passes, radio passes, and cached provider refreshes.
- Open-Meteo Geocoding - server-side place search for observer locations.
- Sunrise-Sunset - non-critical daylight and twilight enrichment during pass refresh.
- Resend - manual and scheduled email alert delivery.
- Vercel - app deployment and cron execution for `/api/cron/alerts`.

## Running locally

```bash
npm install
cp .env.local.example .env.local
```

Fill `.env.local` with Supabase credentials first:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_BASE_URL=http://localhost:3000
```

Add server-only values for the full reviewer path:

```txt
SUPABASE_SERVICE_ROLE_KEY=
N2YO_API_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
CRON_SECRET=
```

Start the app:

```bash
npm run dev
```

Then open:

```txt
http://localhost:3000
```

Supabase setup:

1. Create a Supabase project and enable email/password auth.
2. Apply all SQL files in `supabase/migrations` in order.
3. Run `supabase/seed.sql` or paste it into the Supabase SQL editor to load the curated satellite catalogue.
4. Create the reviewer account in Supabase Auth or through `/login`.

To prepare a seeded reviewer account after creating the Supabase Auth user, set `REVIEWER_USER_ID` and run:

```bash
npm run seed:reviewer
```

See [docs/test-account-setup.md](docs/test-account-setup.md) for the full reviewer account setup path.

Before deployment or submission, run:

```bash
npm run check:readiness
```

See [docs/deployment-readiness.md](docs/deployment-readiness.md) for remote checks and warning meanings.

Reviewer-facing docs:

- [Architecture walkthrough](docs/architecture-walkthrough.md)
- [Reviewer demo script](docs/reviewer-demo-script.md)
- [Reviewer account validation](docs/reviewer-account-validation.md)
- [Submission checklist](docs/submission-checklist.md)
- [Decision records](docs/decision-records.md)

### Environment variables

Required for app/auth runtime:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` or `APP_BASE_URL`

Server-only variables:

- `SUPABASE_SERVICE_ROLE_KEY` - required when server/admin operations use the admin client.
- `N2YO_API_KEY` - required when refreshing live TLE or pass-provider data.
- `RESEND_API_KEY` - required for manual alert email sending and scheduled cron delivery.
- `RESEND_FROM_EMAIL` or `ALERT_FROM_EMAIL` - required for manual alert email sending and scheduled cron delivery.
- `CRON_SECRET` - required for the protected Vercel Cron alert route.
- `REVIEWER_USER_ID` - local-only helper for `npm run seed:reviewer`; this identifies an existing Supabase Auth user and is not a password.

Do not expose service role, N2YO, Resend, or cron secrets to client components. Only `NEXT_PUBLIC_*` values are browser-safe.

### Auth setup

SurfPass uses Supabase email/password auth for the MVP. Configure a Supabase project, enable email/password sign-in, and add the public URL and anon key to `.env.local`.

Protected app routes redirect unauthenticated users to `/login`. The landing page remains public. If Supabase credentials are missing locally, auth actions fail with a clear configuration message instead of silently falling back to placeholder users.

## Assumptions

### Product interpretation

SurfPass is not a raw satellite tracker. It is a coordination and alerting app for short satellite pass opportunities.

### What is a good pass?

A good radio pass is a future pass where the satellite reaches at least 30 degrees max elevation from the chosen location.

A good visual pass is a future pass returned by the provider as visible, with a useful duration and meaningful elevation.

Visual passes use N2YO `visualpasses`; radio passes use N2YO `radiopasses`. SurfPass scores normalised provider data as `excellent`, `good`, or `low` using max elevation, duration, and visual magnitude when available.

Sunrise-Sunset is used as non-critical daylight and twilight enrichment during pass refresh. It labels cached pass cards as daylight, night, civil twilight, nautical twilight, astronomical twilight, or unknown. N2YO remains the source of truth for visual pass predictions, and daylight context does not determine whether a pass is valid.

### What does coordination mean?

Coordination means shared group subscriptions, a common pass feed, RSVP state, and alert preferences. Chat is intentionally out of scope for the MVP.

RSVP coordination is persisted in `pass_rsvps`. Each group member can mark one readiness state per group/pass: `going`, `maybe`, or `skipping`; changing state updates the existing record rather than creating a duplicate.

### Groups and subscriptions

Groups define the shared coordination context. `group_members` stores ownership and membership, and `group_subscriptions` defines what the group watches: saved location, satellite, pass type, quality thresholds, forecast horizon, and alert intent.

The MVP keeps invite links out of scope. Test users and memberships can be preloaded or managed manually until an invitation flow is added.

### Observer locations

Saved observer locations use WGS84 latitude and longitude. Open-Meteo Geocoding is queried through the server-side `/api/geocode` route so provider calls and validation stay off the browser.

Elevation is stored in metres. When Open-Meteo does not provide elevation, SurfPass stores `0` and treats it as an explicit MVP fallback until richer site metadata is added.

### Satellite catalogue

The curated catalogue is intentionally small for the MVP: ISS, Hubble, NOAA 18, NOAA 19, SO-50, and AO-91. These records are seeded by NORAD ID and can be used later in group subscriptions.

Custom NORAD lookup validates a satellite through the server-side N2YO TLE endpoint when `N2YO_API_KEY` is configured. The key is never exposed to the browser, and full catalogue browsing is out of scope.

### Caching and failure handling

N2YO is transaction-limited, so pass predictions are cached and reused across group members. If the provider fails, the app should show stale cached data where possible.

Pass refresh is user-triggered from a group page. The refresh checks `group_subscriptions`, reuses cached predictions that are less than six hours old, and only calls N2YO for stale or missing subscription data. Provider failures are logged in `api_fetch_logs`; if older cached predictions exist, the group feed remains visible with a stale warning.

Daylight enrichment is attempted after N2YO pass normalisation and stored on `pass_predictions` when available. If Sunrise-Sunset is unavailable, pass refresh still succeeds and the card shows `Light unknown`.

The dashboard is a cached operational overview. It reads saved locations, joined groups, group subscriptions, and cached future pass predictions from Supabase; it does not call N2YO during render. Pass data appears on the dashboard only after a group page refresh stores predictions.

### Alerting and deduplication

Email is the MVP alert channel. Users can configure email alerts per group from `/settings`; missing preferences default to enabled with a 30 minute lead time until persisted.

Group subscriptions still control whether a watched satellite/location/pass type is alertable. Pass cards combine subscription intent, the signed-in user's group preference, pass thresholds, and `notification_deliveries` to show `Alerts off`, `Scheduled`, `Sent`, `Skipped`, or `Failed`.

`notification_deliveries` is the source of truth for sent alert state. A pass is never shown as sent unless a delivery record with `status='sent'` exists for the current user, group, pass, channel, and lead time.

`POST /api/alerts/test` sends a guarded manual test alert for the signed-in user only. The route requires `groupId`, `passPredictionId`, and an optional `leadMinutes`; it verifies group membership, checks the pass belongs to that group subscription context, claims a pending delivery row, sends through Resend, then marks the row sent after Resend accepts the email.

`GET /api/cron/alerts` is the scheduled alert worker. Vercel calls it every 15 minutes with `Authorization: Bearer ${CRON_SECRET}`. The worker reads cached `pass_predictions`, `group_subscriptions`, group membership, and `alert_preferences`; it does not call N2YO. Eligible future passes are selected by each user's lead-time window, sent through Resend, and deduped by `notification_deliveries`.

Scheduled alerts are batched into email digests by user, group, channel, and lead time. A digest can contain multiple pass windows, but SurfPass still records one `notification_deliveries` row per pass so per-pass dedupe and pass-card sent state remain durable.

Test the cron route locally with:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/alerts
```

## Architecture notes

SurfPass uses the Next.js App Router with Server Components by default. Interactive forms and controls are isolated into Client Components only where browser state, form actions, or toasts are needed.

Supabase Auth, Postgres, and RLS provide the primary security boundary. Normal user mutations use authenticated Supabase server clients; service-role access is kept server-only for provider cache writes, custom satellite upserts, notification delivery records, and cron processing.

Location search is brokered by a Next.js Route Handler at `/api/geocode`. The browser receives only normalised location candidates, and saving a location happens through authenticated Server Actions backed by Supabase RLS.

Custom satellite lookup is brokered by `/api/satellites/custom`. The route validates the request body, requires an authenticated user, calls N2YO server-side, then uses the server-only Supabase admin client to upsert catalogue records because satellite writes are not client-writable under RLS.

Provider responses are normalised before storage or UI display. Pass scoring is stored with cached `pass_predictions`, and the dashboard reads only cached Supabase state.

Group creation and subscription writes use authenticated Supabase server actions. Group owners create subscriptions in the MVP, matching the current conservative RLS policy.

N2YO pass refresh is brokered by `POST /api/groups/[id]/refresh-passes`. The route requires an authenticated group member, uses the server-only admin Supabase client to write cached `pass_predictions`, and never exposes `N2YO_API_KEY` to the browser.

The authenticated dashboard is backed by `src/lib/dashboard/queries.ts`. It selects the next useful cached pass across joined groups, preferring higher score before start time, and falls back to explicit empty states when no cached forecasts exist.

RSVP writes use authenticated server actions and the same group membership checks as the pass feed. A pass can only be RSVP'd when it belongs to a subscription for that group.

Alert preference writes use authenticated server actions with the normal Supabase user client. RLS ensures users can only upsert their own `alert_preferences` rows for groups they belong to.

Manual alert tests use authenticated route handlers. The route verifies the user with the normal Supabase client, sends only to the signed-in user's email address, and uses the server-only admin client to claim and update `notification_deliveries` because client writes to delivery records are intentionally blocked by RLS.

Scheduled alert processing uses the Vercel Cron route at `/api/cron/alerts`. The route is protected by `CRON_SECRET`, uses the server-only Supabase admin client, reads cached pass predictions only, and writes delivery records after Resend accepts a message.

Group detail pages include a scoped System evidence panel. It shows current group cache state, provider fetch attempts tagged to that group, the signed-in user's own notification deliveries, and alert readiness counts without exposing raw provider payloads, global logs, API keys, or other users' delivery records.

## Data model

- `profiles` - one row per Supabase Auth user.
- `locations` - user-owned observer sites with WGS84 latitude/longitude, elevation, timezone, and default flag.
- `satellites` - globally readable catalogue records keyed by unique `norad_id`.
- `groups` - shared coordination spaces owned by a profile.
- `group_members` - owner/member roster for each group.
- `group_subscriptions` - the shared-state centre: group plus location plus satellite plus pass type plus thresholds and alert intent.
- `pass_predictions` - cached provider pass windows keyed by stable `cache_key`.
- `pass_rsvps` - structured readiness state, unique per group/pass/user.
- `alert_preferences` - per-user, per-group email preference and lead time.
- `notification_deliveries` - durable email delivery claims and sent records for dedupe.
- `api_fetch_logs` - provider and cron diagnostics for reliability review.

Important constraints:

- Locations allow at most one default per user.
- Satellites are unique by NORAD ID.
- Group subscriptions are unique by group, location, satellite, and pass type.
- Pass predictions are unique by cache key.
- RSVP rows are unique by group, pass prediction, and user.
- Notification deliveries are unique by user, group, pass prediction, channel, and lead time.

## Key decisions I would defend

- SurfPass is a coordination app, not a map-first tracker.
- Pass cards come before maps because the first question is when the next useful window opens.
- Timeline and direction arc come before maps because action-critical pass information beats decorative tracking.
- Group subscriptions are the centre of shared state.
- RSVP is used instead of chat to keep coordination structured.
- Email comes before SMS because it proves the alert pipeline with lower delivery and compliance risk.
- Provider data is cached to protect reliability and rate limits.
- Alert deliveries are deduped in the database, not guessed in the UI.
- Cron alerts read cached predictions rather than calling N2YO from the scheduled worker.

## Known limitations

- Scheduled alert delivery batches multiple eligible passes into one email digest per user, group, channel, and lead time.
- Alert delivery uses a pending `notification_deliveries` claim before calling Resend, then marks the row `sent` only after provider acceptance. The database unique constraint and Resend idempotency key reduce duplicate-send risk under overlapping requests.
- Cron depends on refreshed pass cache. It does not fetch N2YO predictions in the background.
- SMS and WhatsApp are out of scope.
- Alerts are email-only in the MVP.
- Weather and cloud-cover scoring are out of scope.
- Full satellite catalogue browsing is out of scope.
- N2YO free-tier limitations apply, so pass refreshes are cached and user-triggered.
- Group invite links and member self-service are not implemented.
- No Doppler correction, frequency metadata, rig control, antenna rotator control, chat, maps, or sky plots in this checkpoint.

## If I had more time

- Add stale pending-claim cleanup and richer digest summaries for higher-volume alert processing.
- Add weather/cloud-cover enrichment after the core pass pipeline is stable.
- Add group invite links and member management.
- Add amateur radio frequency/mode metadata and Doppler guidance.
- Add map and sky-plot views after pass cards remain the primary workflow.
