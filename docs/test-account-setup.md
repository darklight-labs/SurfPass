# SurfPass Test Account Setup

## Purpose

Prepare one reviewer account with enough real state to exercise the SurfPass loop without asking the reviewer to build data from scratch.

The seeded reviewer state is:

- Cape Town / Signal Hill saved observer location
- Johannesburg / Observatory saved observer location
- Cape Town Evening Spotters group
- Reviewer as group owner/member
- ISS visual group subscription
- SO-50 radio group subscription
- Email alert preference enabled with a 30 minute lead time

Supabase Auth users are not seeded in SQL for hosted Supabase. Create the test account through Supabase Auth or the app first, then seed app data against that user's id.

## Required Env Vars

Required for the reviewer data script:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REVIEWER_USER_ID`

Required later for the full reviewer pass/alert path:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `N2YO_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` or `ALERT_FROM_EMAIL`
- `CRON_SECRET`
- `APP_BASE_URL` or `NEXT_PUBLIC_APP_URL`

Do not commit `.env.local`, real credentials, passwords, service role keys, or API keys.

## Create Test Account

Create the reviewer account with Supabase email/password auth.

Recommended hosted flow:

1. Open the Supabase project.
2. Go to Authentication.
3. Create a user with the final reviewer email and password.
4. Confirm the user has an email address.
5. Keep the password outside git until final submission instructions are ready.

Local alternative:

1. Run the app with Supabase env vars configured.
2. Open `/login`.
3. Use the sign-up mode to create the reviewer account.

## Capture Auth User Id

Capture the Supabase Auth user id after the account exists.

SQL option in Supabase SQL editor:

```sql
select id, email
from auth.users
where email = 'reviewer@example.com';
```

Set the id in local environment before running the seed helper:

```bash
REVIEWER_USER_ID=00000000-0000-0000-0000-000000000000 npm run seed:reviewer
```

The script also reads `.env` and `.env.local`, so `REVIEWER_USER_ID` can be placed in `.env.local` for local setup. Do not commit it if it identifies a real hosted account.

## Seed Curated Satellites

Run the global catalogue seed before reviewer data setup:

```sql
\i supabase/seed.sql
```

Or paste `supabase/seed.sql` into the Supabase SQL editor.

The seed file is catalogue-only and uses `on conflict (norad_id)`, so it can be rerun safely.

The reviewer seed script also verifies/upserts the two catalogue records it needs: ISS and SO-50.

## Seed Location

Preferred path:

```bash
npm run seed:reviewer
```

The script creates or updates the default observer location used by the seeded group subscriptions:

- Name: Cape Town
- Label: Cape Town / Signal Hill
- Latitude: `-33.9258`
- Longitude: `18.4232`
- Elevation: `25`
- Timezone: `Africa/Johannesburg`
- Country: South Africa
- Default: true

The script also creates or updates a second saved observer location so the reviewer account is not single-location only:

- Name: Johannesburg
- Label: Johannesburg / Observatory
- Latitude: `-26.2041`
- Longitude: `28.0473`
- Elevation: `1753`
- Timezone: `Africa/Johannesburg`
- Country: South Africa
- Default: false

Manual UI path:

1. Sign in as the reviewer.
2. Open `/locations`.
3. Search for Cape Town.
4. Save a result and mark it default.
5. Search for Johannesburg and save it as a second observer location.

## Seed Group

Preferred path:

```bash
npm run seed:reviewer
```

The script creates or updates:

- Group: Cape Town Evening Spotters
- Description: Shared watch list for useful visual and radio satellite passes around Cape Town.
- Owner: reviewer auth user

Manual UI path:

1. Sign in as the reviewer.
2. Open `/groups`.
3. Create Cape Town Evening Spotters.

## Seed Group Membership

The migration has a trigger that creates owner membership when a group is inserted.

The reviewer seed script also upserts the owner membership directly:

- Role: owner
- User: reviewer auth user
- Group: Cape Town Evening Spotters

## Seed Group Subscription

Preferred path:

```bash
npm run seed:reviewer
```

The script creates or updates two subscriptions:

1. ISS radio from Cape Town / Signal Hill (primary smoke test)
   - `norad_id`: 25544
   - `pass_type`: radio
   - `min_elevation`: 10
   - `days_ahead`: 10
   - `alerts_enabled`: true

2. ISS visual from Cape Town / Signal Hill (optional)
   - `norad_id`: 25544
   - `pass_type`: visual
   - `min_visibility_seconds`: 120
   - `days_ahead`: 10
   - `alerts_enabled`: true

For a manually created radio subscription, a 1° minimum elevation is also a
valid diagnostic setting. Visual mode can legitimately return zero visible
windows and is not the primary provider-health check.

The database unique constraint on group, location, satellite, and pass type prevents duplicates.

## Refresh Pass Data From App

The reviewer seed script does not call N2YO.

After seeding:

1. Sign in as the reviewer.
2. Open `/groups`.
3. Open Cape Town Evening Spotters.
4. Click `Refresh passes`.
5. Confirm the response summary shows subscriptions checked, provider fetches
   attempted, provider successes, zero-result subscriptions, provider failures,
   cache hits, passes stored, and passes rendered.
6. Confirm at least one ISS radio pass card appears when N2YO returns valid
   radio pass data.

This keeps provider calls explicit and avoids hidden N2YO usage from seed tooling.

## RSVP Example

After pass cards exist:

1. Open the Cape Town Evening Spotters group page.
2. Choose `Going` on the next useful pass.
3. Optionally choose `Maybe` on another pass.
4. Reload the page and confirm the current user's RSVP state persists.

If no future pass is returned by N2YO during setup, leave RSVP examples for final QA after a later refresh.

## Alert Preference And Test Alert

The reviewer seed script sets:

- `email_enabled`: true
- `lead_minutes`: 30

Confirm in the UI:

1. Sign in as the reviewer.
2. Open `/settings`.
3. Confirm Cape Town Evening Spotters has email alerts enabled with a 30 minute lead time.

Manual test alert after pass refresh:

1. Configure Resend env vars.
2. Copy a `passPredictionId` from the refreshed group pass feed or database.
3. Send an authenticated `POST /api/alerts/test` request with `groupId`, `passPredictionId`, and `leadMinutes`.
4. Confirm the first send records `notification_deliveries.status='sent'`.
5. Repeat the same request and confirm it dedupes.

## Final README Values To Update

Before submission, update `README.md`:

- `Live URL`
- `Test account` email
- `Test account` password
- Any deployment-specific notes for Supabase, N2YO, Resend, and cron

Use [docs/reviewer-account-validation.md](reviewer-account-validation.md) for the final non-secret account/data checklist.

Do not commit secrets, service role keys, API keys, or passwords in any env file.
