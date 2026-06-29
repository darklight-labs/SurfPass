# SurfPass Reviewer Flow

## Reviewer Happy Path

1. Open the live URL, or run the app locally and open `http://localhost:3000`.
2. Go to `/login`.
3. Sign in with the documented test account. If no deployed test account exists yet, create a local Supabase email/password account.
4. Confirm `/dashboard` loads after authentication.
5. Open `/locations`, search for a place such as `Cape Town`, and save one observer location.
6. Open `/satellites` and confirm the curated catalogue is visible.
7. Open `/groups`, create a group, and land on `/groups/[id]`.
8. Add a group subscription by selecting the saved location, a satellite, pass type, thresholds, days ahead, and alert intent.
9. Use `Refresh passes` on the group page to fetch or reuse N2YO cached pass predictions.
10. Confirm pass cards appear in the group pass feed, then mark RSVP readiness as `Going`, `Maybe`, or `Skipping`.
11. Inspect `System evidence` on the group page to verify cache state, scoped provider logs, and current-user notification delivery records.
12. Open `/settings` and confirm group email alert preferences can be enabled/disabled and assigned a lead time.
13. Return to `/dashboard` and confirm counts, readiness, alert state, and cached pass summaries reflect the saved data.

## Required Env Vars

Public runtime:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Server-only runtime:

- `APP_BASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` - required for admin cache writes and custom satellite upserts.
- `N2YO_API_KEY` - required for custom NORAD lookup and live pass refresh.
- `RESEND_API_KEY` - required for manual and scheduled email alert delivery.
- `RESEND_FROM_EMAIL` or `ALERT_FROM_EMAIL` - required for manual and scheduled email alert delivery.
- `CRON_SECRET` - required for the protected scheduled alert route.

Only `NEXT_PUBLIC_*` values are browser-safe.

## Test Account Setup

For final submission, add a Supabase Auth user and document the email/password in `README.md`.

Until deployment credentials exist, use the `/login` sign-up tab against a configured local or hosted Supabase project. The database trigger creates the matching `profiles` row when the auth user is inserted.

Use [docs/test-account-setup.md](test-account-setup.md) to seed reviewer data after the Auth user exists.

Expected seeded reviewer state:

- Saved locations: Cape Town / Signal Hill and Johannesburg / Observatory
- Group: Cape Town Evening Spotters
- Membership: reviewer is owner
- Subscriptions: ISS visual and SO-50 radio from Cape Town
- Alert preference: email enabled, 30 minute lead time
- Pass feed: refreshed from the group page when `N2YO_API_KEY` is configured
- RSVP: added manually after a refreshed pass exists

## How To Seed Curated Satellites

1. Apply all SQL files in `supabase/migrations` to the Supabase project in order.
2. Run `supabase/seed.sql` in the Supabase SQL editor or through the Supabase CLI.
3. Open `/satellites` while signed in.
4. Confirm ISS, Hubble, NOAA 18, NOAA 19, SO-50, and AO-91 are listed.

The seed file uses `on conflict (norad_id)` so it can be rerun safely.

## How To Test Geocoding

1. Sign in.
2. Open `/locations`.
3. Search for `Cape Town`.
4. Confirm results show normalized name, country or region, latitude/longitude, elevation when available, and timezone.
5. Save one result.
6. Confirm the saved location appears in the saved locations list and can be marked default.

The browser calls `/api/geocode`; Open-Meteo is not called directly from client code.

## How To Test Group Subscription

1. Ensure at least one saved location exists.
2. Ensure the curated satellite seed has been applied.
3. Open `/groups` and create a group.
4. On the group detail page, use the add subscription form.
5. Select location, satellite, pass type, thresholds, days ahead, and alert intent.
6. Submit once and confirm the subscription appears.
7. Submit the same combination again and confirm the duplicate constraint is handled with a clear error.

Subscriptions are unique by group, location, satellite, and pass type.

## How To Test Pass Refresh

1. Configure `SUPABASE_SERVICE_ROLE_KEY` and `N2YO_API_KEY`.
2. Open a group with an ISS / NORAD 25544 / radio subscription using 10°
   minimum elevation and 10 days ahead (1° is also valid for diagnostics).
3. Click `Refresh passes`.
4. Confirm the summary reports subscriptions checked, provider fetches
   attempted, provider successes, zero-result subscriptions, provider failures,
   cache hits, passes stored, and passes rendered.
5. Confirm upcoming ISS radio pass cards appear in the group pass feed when
   N2YO returns valid radio data. Visual zero-result responses are non-fatal.
6. Inspect `System evidence` and confirm cached prediction counts and provider fetch attempts are visible for the group.
7. Click refresh again within six hours and confirm fresh cache is reused where possible.

If N2YO is unavailable or not configured, the route returns a clear error. If stale cached data exists, the UI should keep showing it with a warning.

## How To Test RSVP

1. Refresh passes for a group so pass cards exist.
2. On a pass card, choose `Going`, `Maybe`, or `Skipping`.
3. Confirm the card updates after the action and the count changes.
4. Change the RSVP state and confirm it updates the existing readiness record.
5. Reload the group page and confirm the current user state persists.

Security checks require the user to be a member of the group and the pass to belong to a subscription for that group.

## How To Test Alert Preferences

1. Sign in with a user that belongs to at least one group.
2. Open `/settings`.
3. Toggle email alerts off for a group and save.
4. Confirm group pass cards show alerts off for that user's future qualifying passes.
5. Toggle email alerts on, choose 15, 30, 60, or 120 minutes, and save.
6. Confirm future qualifying pass cards show scheduled unless a matching `notification_deliveries` row with `status='sent'` already exists.

Manual and scheduled sends create `notification_deliveries`, and those records drive real sent state.

## How To Test Email Alert Manually

1. Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL` or `ALERT_FROM_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`, and `APP_BASE_URL`.
2. Sign in with a user that belongs to a group with a refreshed future pass.
3. Copy the group id and pass prediction id from the database or network response for the group pass feed.
4. Send an authenticated POST request to `/api/alerts/test`:

```json
{
  "groupId": "00000000-0000-0000-0000-000000000000",
  "passPredictionId": "00000000-0000-0000-0000-000000000000",
  "leadMinutes": 30
}
```

5. Confirm the response returns `"status": "sent"` and a provider message id.
6. Repeat the same request and confirm it returns `"status": "deduped"`.
7. Confirm a `notification_deliveries` row with `status='sent'` exists for the user, group, pass, `email` channel, and lead time.
8. Inspect `System evidence` and confirm the signed-in user's notification delivery is visible without exposing other users' deliveries.

The route sends only to the signed-in user's Supabase Auth email. No arbitrary recipient override is supported.

## How To Test Scheduled Cron Alerts

1. Configure `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` or `ALERT_FROM_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`, and `APP_BASE_URL`.
2. Ensure a group has an alert-enabled subscription, an email-enabled alert preference, and a cached future pass prediction whose `start_utc` is within the user's lead time plus or minus seven minutes.
3. Start the app locally.
4. Confirm missing or wrong authorization is rejected:

```bash
curl http://localhost:3000/api/cron/alerts
curl -H "Authorization: Bearer wrong-token" http://localhost:3000/api/cron/alerts
```

5. Trigger the worker with the configured secret:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/alerts
```

6. Confirm the JSON reports `passesConsidered`, `digestsAttempted`, `digestsSent`, `passesIncluded`, delivery counts, and warnings.
7. Run the same command again and confirm matching deliveries are deduped.
8. Confirm `notification_deliveries` contains one sent row per user, group, pass, `email` channel, and lead time. Multiple rows may share the same provider message id when they were sent in one digest.

The cron worker reads cached `pass_predictions`; it does not call N2YO.

## Final Deployment Instructions

1. Deploy the repository to Vercel.
2. Add all required Vercel environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `N2YO_API_KEY`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `CRON_SECRET`
   - `NEXT_PUBLIC_APP_URL`
   - `APP_BASE_URL`
3. Set `NEXT_PUBLIC_APP_URL` and `APP_BASE_URL` to the final Vercel URL.
4. Apply all SQL files in `supabase/migrations` to the Supabase project in order.
5. Run `supabase/seed.sql` to seed curated satellites.
6. Create the final Supabase test account.
7. Capture the test account Auth user id.
8. Seed reviewer data with `npm run seed:reviewer` or follow [docs/test-account-setup.md](test-account-setup.md).
9. Sign in through the deployed app as the reviewer.
10. Open the seeded group and click `Refresh passes`.
11. RSVP to at least one pass if pass cards are returned.
12. Confirm `/settings` shows email alerts enabled.
13. Send one manual test alert with `/api/alerts/test`.
14. Test `/api/cron/alerts` with and without `CRON_SECRET`.
15. Update `README.md` with the live URL and test account credentials.
16. Fill `docs/submission-email.md` with the GitHub URL, live URL, and test account.
17. Complete [docs/reviewer-account-validation.md](reviewer-account-validation.md) without committing secrets.
18. Send the submission email.

## What Is Still Pending Before Final Submission

- Deploy to Vercel and add the live URL.
- Create and document the final reviewer test account.
- Confirm scheduled Resend delivery in the deployed Vercel environment.
- Run a full deployed reviewer-path QA pass with real Supabase and N2YO credentials.

## Known Limitations

- Manual and scheduled email delivery are active when Resend and cron secrets are configured.
- Scheduled delivery batches multiple eligible passes into one email digest per user, group, channel, and lead time.
- Alert delivery claims a pending `notification_deliveries` row before calling Resend, then marks it sent after provider acceptance. A stale pending-claim cleanup job is future hardening.
- SMS and WhatsApp are out of scope.
- Weather and cloud-cover scoring are out of scope.
- Full satellite catalogue browsing is out of scope.
- N2YO free-tier limitations apply.
- Group invite links and member self-service are not implemented.
- Maps, sky plots, Doppler guidance, rig control, and chat are intentionally out of this checkpoint.
