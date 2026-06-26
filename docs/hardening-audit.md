# SurfPass Hardening Audit

## Audit Checklist

### Secrets

- Service role, N2YO, Resend, and cron secrets are server-only.
- `.env.local` is ignored.
- `.env.local.example` contains empty placeholders only.
- Client Supabase code uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Auth

- Protected app routes are wrapped by the authenticated app layout.
- Mutating server actions require the current Supabase user.
- Mutating API routes require either the current Supabase user or `CRON_SECRET`.
- Manual alert send requires the signed-in user and sends only to that user's email.
- Cron alert processing requires `Authorization: Bearer ${CRON_SECRET}`.

### RLS

- RLS is enabled on all public tables.
- Users can read/update only their own profile.
- Users can CRUD only their own locations.
- Group rows, rosters, subscriptions, pass predictions, and RSVP rows are scoped to group membership.
- Group creation and subscription RLS is captured in `supabase/migrations/0003_group_rls_repair.sql`, matching the hosted Supabase repair for `groups`, `group_members`, `group_subscriptions`, `is_group_member`, and `is_group_owner`.
- RSVP writes require group membership and a pass prediction linked to a group subscription.
- Notification deliveries are readable only by the owning user.
- Provider cache, custom satellite, and alert delivery writes use server-only service-role code.
- The group System evidence panel verifies group membership before reading evidence, shows only current-user notification deliveries, and filters provider logs by group-scoped metadata.

### Provider Failure Handling

- Missing N2YO config maps to a clear provider-unavailable message.
- N2YO refresh reuses fresh cache and keeps stale cache visible when live refresh fails.
- Sunrise-Sunset daylight enrichment is non-blocking and degrades to unknown light context.
- Open-Meteo errors return a clear geocoding failure to the search UI.
- Missing Resend config fails only when sending.
- Cron reads cached pass predictions only and returns zero-count summaries when no eligible pass data exists.
- Duplicate alert attempts are deduped by a durable delivery key.

### UI Failure States

- Dashboard empty state directs users to locations, groups, subscriptions, and refresh.
- Location search shows validation, loading, empty, and provider error states.
- Satellite lookup shows invalid input and provider failure states.
- Groups and group detail show empty subscription/pass feed states.
- Pass refresh shows success summaries, provider warnings, and errors.
- Alert badges distinguish off, scheduled, sent, skipped, and failed states.
- System evidence surfaces cache state, scoped provider attempts, and current-user deliveries without raw provider payloads or secrets.

## Findings

1. Alert delivery dedupe was previously check-before-send plus unique insert after Resend accepted. Under overlapping manual or cron requests, two sends could race before one insert won.
2. Pass-card and dashboard sent-state queries treated any `notification_deliveries` row as sent. That would become unsafe once pending delivery claims exist.
3. Settings page copy still said email sending was not active.
4. Documentation still described the older alert dedupe model and did not distinguish pending claims from sent delivery records.

## Fixes Applied

1. Added `notification_deliveries.status` with `pending`, `sent`, and `failed` states in `supabase/migrations/0001_initial_schema.sql`.
2. Made `sent_at` nullable so pending delivery claims are not represented as sent.
3. Updated `src/types/database.ts` to reflect delivery status and nullable `sent_at`.
4. Updated manual alert sending to claim a pending delivery row before calling Resend, delete the pending claim if Resend fails, and mark the row sent only after provider acceptance.
5. Updated scheduled cron delivery to use the same pending-claim flow.
6. Updated dashboard and group pass-feed queries to count only `status='sent'` delivery rows as delivered alert state.
7. Updated settings copy to describe active manual and scheduled email delivery.
8. Updated README, assumptions, reviewer flow, and test account setup docs to describe the pending-claim delivery model.
9. Added `supabase/migrations/0003_group_rls_repair.sql` so the manual hosted Supabase group RLS repair is reproducible on fresh or existing projects.

## Validation Performed

- `npm run lint`
- `npm run build`
- Search for legacy pass-window type references
- Search for obvious committed secret values
- Search for stale cleanup, console, and local URL signals

## Residual Risks

- N2YO free-tier limits still apply. Pass refresh is explicit and cached, but a reviewer can still hit provider limits if refreshes are repeated aggressively.
- Cron alerting relies on cached `pass_predictions`; it does not fetch N2YO in the background.
- Daylight/twilight labels depend on Sunrise-Sunset availability during pass refresh. If unavailable, cards show unknown light context.
- Provider logs in the evidence panel depend on server-side service-role configuration and only include logs tagged with the current group id.
- Scheduled email delivery batches by user, group, channel, and lead time, while delivery dedupe remains one row per pass.
- If Resend accepts an email but the follow-up database update fails, a pending claim can remain and block retries until inspected.
- Reviewer test account data still depends on final Supabase Auth user creation and seeding.
- Full invite links and member self-service remain out of scope.

## Submission-Safe Limitations

- SMS and WhatsApp are out of scope.
- Weather and cloud-cover scoring are out of scope.
- Full satellite catalogue browsing is out of scope.
- Maps, sky plots, Doppler guidance, rig control, and chat are intentionally excluded from this assessment build.
