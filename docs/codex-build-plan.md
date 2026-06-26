# SurfPass Codex Build Plan

Status note: this is the initial execution plan from the scaffold stage. For the current implemented architecture and reviewer path, see [architecture-walkthrough.md](architecture-walkthrough.md), [decision-records.md](decision-records.md), and [reviewer-demo-script.md](reviewer-demo-script.md).

## Current Repo State

SurfPass is a Next.js 16 App Router project with TypeScript, Tailwind 4, shadcn/ui primitives, Supabase packages, Resend, Zod, React Hook Form, and TanStack packages installed.

What exists:

- `src/app/layout.tsx` exists and loads fonts/global CSS, but still uses create-next-app metadata.
- `src/app/page.tsx` is still the create-next-app default landing page.
- App route files exist for `/dashboard`, `/groups`, `/groups/new`, `/groups/[id]`, `/locations`, `/satellites`, `/settings`, and `/login`, but these files are currently empty placeholders.
- API route files exist for geocoding, custom satellite lookup, group pass refresh, group subscriptions, group passes, RSVP, alert testing, and cron alerts, but these files are currently empty placeholders.
- `src/components/ui` contains non-empty shadcn/ui primitive components.
- Domain components under `src/components/surface`, `src/components/data-display`, `src/components/forms`, `src/components/feedback`, and `src/components/navigation` exist as filenames but are empty placeholders.
- Library files for env validation, Supabase, N2YO, pass caching, pass scoring, Open-Meteo, alert email, alert scheduling, auth guards, dates, and formatting exist as filenames but are empty placeholders.
- `supabase/migrations/0001_initial_schema.sql` exists but is empty.
- `vercel.json` already schedules `/api/cron/alerts` every 15 minutes.
- `README.md`, `docs/design-system.md`, `docs/frontend-implementation-rules.md`, and `docs/implementation-plan.md` contain useful product and implementation direction.
- `docs/design-note.md`, `docs/assumptions.md`, `docs/architecture.md`, and all ADR files currently exist but are empty.

Important repo hygiene findings:

- `.env.local.example` exists and documents required variables, but `.gitignore` ignores `.env*`, so the example file is not currently tracked.
- `.next` output exists locally and is ignored.
- There is no `proxy.ts` for Supabase session refresh/protected route checks yet.
- There is no implemented Supabase schema, RLS policy set, auth callback, provider client, cache layer, alert worker, or real app UI yet.
- The current shadcn Card/Button defaults use very rounded primitives. App-specific SurfPass surfaces should override this toward the requested Swiss operational style with compact radii.

## Installed Packages Detected

Runtime dependencies:

- `next@16.2.9`
- `react@19.2.4`
- `react-dom@19.2.4`
- `@supabase/ssr@0.12.0`
- `@supabase/supabase-js@2.108.2`
- `resend@6.14.0`
- `zod@4.4.3`
- `react-hook-form@7.80.0`
- `@hookform/resolvers@5.4.0`
- `@tanstack/react-query@5.101.1`
- `@tanstack/react-table@8.21.3`
- `lucide-react@1.21.0`
- `shadcn@4.11.0`
- `radix-ui@1.6.0`
- `sonner@2.0.7`
- `tailwind-merge@3.6.0`
- `class-variance-authority@0.7.1`
- `clsx@2.1.1`
- `cmdk@1.1.1`
- `date-fns@4.4.0`
- `motion@12.42.0`
- `next-themes@0.4.6`
- `nuqs@2.8.9`
- `leaflet@1.9.4`
- `react-leaflet@5.0.0`
- `react-day-picker@10.0.1`
- `recharts@3.8.0`
- `zustand@5.0.14`
- `tw-animate-css@1.4.0`

Dev dependencies:

- `typescript@5.9.3`
- `eslint@9.39.4`
- `eslint-config-next@16.2.9`
- `tailwindcss@4.3.1`
- `@tailwindcss/postcss@4.3.1`
- `@types/node@20.19.43`
- `@types/react@19.2.17`
- `@types/react-dom@19.2.3`
- `@types/leaflet@1.9.21`

## Missing Packages

No required runtime package from the desired stack is missing.

Provider integrations should use server-side `fetch` rather than adding client SDKs:

- N2YO API: server-side `fetch`
- Open-Meteo Geocoding: server-side `fetch`
- Sunrise-Sunset: server-side `fetch`

Optional additions only if time allows:

- Playwright for smoke testing key auth/dashboard flows.
- Vitest for provider normalisation, scoring, and alert-dedup unit tests.
- Supabase CLI is needed operationally for local database workflows, but it does not need to be an app dependency.

Do not add map or visualization packages now. Leaflet is already installed, and maps are not the core MVP.

## Required File Structure

Keep the existing App Router structure and fill the placeholder files. Add only the missing structure needed for auth/session handling and clear domain boundaries.

Target structure:

```txt
src/
  proxy.ts                       # Next 16 request proxy for session refresh/optimistic route checks
  app/
    layout.tsx
    page.tsx
    (auth)/
      login/page.tsx
      callback/route.ts          # Supabase auth callback if using email links/OAuth later
    (app)/
      layout.tsx                 # protected AppShell
      dashboard/page.tsx
      groups/page.tsx
      groups/new/page.tsx
      groups/[id]/page.tsx
      locations/page.tsx
      satellites/page.tsx
      settings/page.tsx
    api/
      geocode/route.ts
      satellites/custom/route.ts
      groups/[id]/subscriptions/route.ts
      groups/[id]/passes/route.ts
      groups/[id]/refresh-passes/route.ts
      passes/[id]/rsvp/route.ts
      alerts/test/route.ts
      cron/alerts/route.ts
  components/
    ui/
    surface/
    navigation/
    data-display/
    feedback/
    forms/
  lib/
    env/
    supabase/
    auth/
    n2yo/
    geocoding/
    sunrise-sunset/
    passes/
    alerts/
    utils/
  types/
supabase/
  migrations/
docs/
```

Notes from Next.js 16 local docs:

- App Router pages/layouts are Server Components by default. Keep database reads, provider calls, and secrets server-side.
- Use Client Components only for interactive forms, RSVP controls, toasts, dialogs, and local state.
- Route Handlers live under `app/**/route.ts` and use Web Request/Response APIs.
- Middleware is now called Proxy in Next.js 16. Use `proxy.ts` at the project root or `src/proxy.ts`; do not put it under `app`.
- Dynamic route params in App Router examples are async; use the current Next 16 route handler/page typing patterns when implementing.

## Implementation Phases

### Phase 0 - Baseline and Repo Hygiene

Goal: make the scaffold coherent before feature work.

Tasks:

- Update root metadata from create-next-app to SurfPass.
- Replace the default home page with a minimal SurfPass entry page that routes users to login/dashboard without building a marketing site.
- Add or adjust app-level shell files only as needed for protected route layout.
- Fix `.gitignore` so `.env.local.example` can be tracked while real `.env*` files remain ignored.
- Confirm `docs/frontend-implementation-rules.md` remains the front-end source of truth.

Validation gate:

- `npm run lint`
- `npm run build`
- Confirm no actual secret values are committed.

Suggested commit:

- `chore: align scaffold for SurfPass`

### Phase 1 - Database, Types, and RLS

Goal: create the shared-state foundation before UI flows.

Tables and priorities:

- `profiles`: one row per Supabase Auth user, with display name, email, optional callsign, timezone, and timestamps.
- `locations`: user-owned observing/contact locations with name, latitude, longitude, elevation, timezone, and default flag.
- `satellites`: curated and user-added satellites keyed by NORAD ID.
- `groups`: coordination containers owned by a user.
- `group_members`: membership and role state.
- `group_subscriptions`: the shared-state center; group plus satellite plus location plus pass type plus thresholds and active state.
- `pass_predictions`: cached provider-normalized pass windows, keyed for reuse by satellite, location, pass type, and time window rather than by individual user.
- `pass_rsvps`: structured coordination around pass predictions, unique by pass, group, and user.
- `alert_preferences`: user/group/subscription alert choices, initially email only.
- `notification_deliveries`: dedupe and audit records for channel, lead time, user, group, and pass.
- `provider_fetch_logs`: provider status, latency, cache behavior, and failure diagnostics.

RLS priorities:

- Users can read/update their own profile.
- Users can CRUD their own locations.
- Group members can read group, membership, subscriptions, passes, and RSVP summaries.
- Group owners/admins can manage group membership and subscriptions.
- Users can only write their own RSVP and alert preferences.
- Service role can perform cron/provider writes, but service role helpers must never reach client bundles.

Validation gate:

- Migration applies cleanly to a Supabase project.
- Generated or hand-maintained `src/types/database.ts` matches schema.
- Basic RLS smoke checks: owner, member, non-member, service role.
- `npm run lint`
- `npm run build`

Suggested commit:

- `feat: add Supabase schema and RLS foundation`

### Phase 2 - Environment, Supabase Clients, and Auth

Goal: establish real user accounts and server-safe access.

Tasks:

- Implement Zod env validation in `src/lib/env/index.ts`.
- Split Supabase utilities:
  - browser client for Client Components.
  - server client using `@supabase/ssr` cookies.
  - admin/service client for server-only cron and privileged writes.
- Add session refresh proxy following the current Next 16/Supabase SSR pattern.
- Implement `/login` with email/password signup and login.
- Add logout action.
- Ensure profile creation happens via database trigger or server-side bootstrap after signup.
- Protect `(app)` routes with a layout or guard that redirects unauthenticated users.
- Protect API routes with server-side auth checks.

Validation gate:

- New user can sign up, sign in, sign out, and return to a persisted session.
- Unauthenticated users cannot access app pages or mutating APIs.
- Service role key is referenced only in server-only modules.
- `npm run lint`
- `npm run build`

Suggested commit:

- `feat: implement Supabase auth and session guards`

### Phase 3 - Provider Clients and Pass Engine

Goal: make live data reliable before building heavy UI.

Tasks:

- Implement N2YO server client:
  - TLE lookup for custom NORAD validation.
  - visual passes endpoint.
  - radio passes endpoint.
  - typed provider response parsing with Zod.
  - provider error normalization.
- Implement Open-Meteo geocoding client for location search.
- Implement Sunrise-Sunset enrichment for daylight/twilight context by location/date.
- Implement pass normalization from provider payloads into a single domain shape.
- Implement scoring:
  - radio: elevation and duration first, with future-only filtering.
  - visual: provider visibility, duration, elevation, and magnitude. Daylight context is displayed as enrichment, not used as a second validity authority.
- Implement N2YO cache lookup and refresh:
  - read fresh cache first.
  - fetch provider only on miss or explicit refresh.
  - keep stale cached data available on provider failure.
  - write provider fetch logs for success/failure.
- Add defensive rate-limit handling and clear stale/live/cache status values.

Validation gate:

- Provider calls never run client-side.
- N2YO cache is hit on repeated equivalent requests.
- Provider failure returns stale cache where possible and useful error state otherwise.
- Normalizers handle fixture payloads and malformed payloads.
- `npm run lint`
- `npm run build`

Suggested commit:

- `feat: add provider clients and cached pass engine`

### Phase 4 - Core Coordination Product

Goal: build the MVP operational console around group subscriptions and pass cards.

Tasks:

- Implement protected AppShell, SidebarNav, PageHeader, SectionBlock, MetricCard, and EmptyState.
- Implement locations page:
  - geocode search.
  - save location.
  - default location.
  - list locations.
- Implement satellites page:
  - curated useful satellites.
  - custom NORAD lookup with TLE validation.
  - avoid a full catalogue browser.
- Implement groups pages:
  - list groups.
  - create group.
  - group detail.
  - group subscription form.
- Implement pass feed:
  - PassCard before map.
  - live/cached/stale status.
  - pass type: visual or radio.
  - start time, duration, max elevation, direction path, score, and actionability.
- Implement RSVP:
  - going, maybe, skipping.
  - optional short note.
  - RSVP summary counts.
  - no chat.
- Implement dashboard hierarchy:
  1. next useful pass.
  2. visual or radio.
  3. start time.
  4. actionability score.
  5. who is going.
  6. alert scheduled status.
  7. live/cached/stale data status.

Validation gate:

- A signed-in user can create a location, create a group, add a subscription, refresh/load passes, and RSVP.
- A second user can join or be represented as a group member and see shared subscription/pass/RSVP state according to RLS.
- Empty/loading/error/stale states are visible and operationally useful.
- `npm run lint`
- `npm run build`

Suggested commit:

- `feat: build coordination console MVP`

### Phase 5 - Email Alert Pipeline

Goal: prove reliable async alerting with deduplication.

Tasks:

- Implement `src/lib/alerts/email.ts` with Resend.
- Implement scheduler logic in `src/lib/alerts/scheduler.ts`.
- Implement `/api/cron/alerts`:
  - require `CRON_SECRET`.
  - find due alerts by pass start time and lead time.
  - insert a pending `notification_deliveries` row first to claim work.
  - send email through Resend.
  - mark delivery sent, skipped, or failed.
  - never send duplicate alerts for the same user, group, pass, channel, and lead time.
- Keep email as the only MVP channel.
- Implement `/api/alerts/test` only for authenticated development/admin testing.
- Include enough delivery metadata to explain what happened in the UI or logs.

Validation gate:

- Cron rejects missing/invalid secret.
- Re-running cron does not duplicate the same alert.
- Failed sends are recorded and do not hide the error.
- Manual test route cannot be abused by unauthenticated users.
- `npm run lint`
- `npm run build`

Suggested commit:

- `feat: add deduplicated email alert worker`

### Phase 6 - Submission Hardening

Goal: make the assessment defensible and easy to review.

Tasks:

- Complete `README.md`:
  - live URL.
  - test account.
  - setup instructions.
  - required env vars.
  - Supabase migration/RLS notes.
  - provider APIs used.
  - Vercel cron behavior.
  - architecture summary.
  - data model summary.
  - assumptions.
  - known limitations.
  - what to test in the demo.
- Fill `docs/assumptions.md`.
- Fill `docs/architecture.md`.
- Fill ADRs for product scope, data model, and alert pipeline.
- Add final QA checklist.
- Deploy to Vercel and configure env vars.
- Seed or create a small useful test dataset without faking provider pass results.

Validation gate:

- Fresh clone setup path is documented.
- Vercel build succeeds.
- Supabase auth and RLS work in deployed environment.
- Live provider data path works or degrades to clearly labeled stale/cache state.
- Alert cron can be manually verified without duplicate sends.
- README honestly describes what works and what is limited.

Suggested commit:

- `docs: complete submission notes`

## Commit Strategy

Use small, reviewable commits that map to real assessment value:

1. `chore: align scaffold for SurfPass`
2. `feat: add Supabase schema and RLS foundation`
3. `feat: implement Supabase auth and session guards`
4. `feat: add provider clients and cached pass engine`
5. `feat: build coordination console MVP`
6. `feat: add deduplicated email alert worker`
7. `docs: complete submission notes`

Avoid mixing schema, provider logic, UI, and README polish in a single commit. Each commit should pass lint/build before moving on unless a temporary break is clearly documented.

## Swiss Design Principles for SurfPass

The app surface should feel like a quiet operational console, not a space-themed dashboard.

Rules to preserve:

- Pass cards before maps.
- Dashboard content starts with the next useful pass.
- Large page titles, small uppercase section labels, thin dividers, and strong whitespace rhythm.
- Neutral, high-contrast palette with restrained state color.
- Compact cards that read as operational records.
- Tables for secondary records and audit/history views.
- Minimal lucide icons where they clarify meaning: satellite, radio, map pin, bell, users, clock, eye, waves, compass, check, warning, refresh.
- No gradients, neon, space wallpaper, fake 3D, glassmorphism, ornamental effects, or sci-fi cliches.
- Motion only for small state transitions, if used at all.
- Every provider-backed surface must show live, cached, or stale status.
- Every empty state should tell the next operational action.

Implementation note:

- Prefer shadcn/ui primitives, but app-level components should override overly rounded defaults where needed to keep cards and controls compact and precise.

## Data Model Priorities

Model shared state first, visualizations second.

Priority order:

1. Users and profiles.
2. Locations.
3. Satellites.
4. Groups and group members.
5. Group subscriptions.
6. Cached pass predictions.
7. RSVP state.
8. Alert preferences.
9. Notification deliveries.
10. Provider fetch logs.

Key constraints:

- `group_subscriptions` are the center of coordination.
- `pass_predictions` must be cached and reusable across group members.
- `pass_rsvps` should be unique per user/group/pass.
- `notification_deliveries` must have a unique dedupe key covering user, group, pass, channel, and lead time.
- Provider raw payloads should be stored for debugging, but UI should consume normalized pass records.
- RLS should enforce collaboration boundaries; client code should not be trusted to filter private data.

## Authentication Plan

Use Supabase Auth with real email/password accounts for MVP.

Implementation sequence:

1. Build Supabase SSR clients.
2. Add session proxy.
3. Implement login/signup form.
4. Add logout.
5. Create profile rows.
6. Protect app pages.
7. Protect API routes.
8. Verify RLS with multiple users.

Rules:

- Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL` are client-exposed.
- `SUPABASE_SERVICE_ROLE_KEY`, `N2YO_API_KEY`, `RESEND_API_KEY`, and `CRON_SECRET` stay server-only.
- Service role usage belongs only in server-only modules for cron/admin/provider-cache work.

## Provider Integration Plan

N2YO:

- Use server-side fetch only.
- Support TLE lookup for custom NORAD validation.
- Support visual passes and radio passes.
- Cache results by satellite, location, pass type, and requested window.
- Record provider response status and latency.
- Degrade to stale cached pass data on provider failure.

Open-Meteo Geocoding:

- Use for location search.
- Store selected coordinates and useful labels in `locations`.
- Do not expose this as a map-first workflow.

Sunrise-Sunset:

- Enrich pass records with daylight/twilight context.
- Use this as contextual pass-card enrichment, not as a separate source of truth for visual pass validity.

Provider failure behavior:

- Show stale cached data if available.
- Show clear empty/error state if no cache exists.
- Do not block unrelated group or RSVP state when a provider fails.
- Never expose provider API keys to the browser.

## Alerting Plan

Email is the MVP alert channel. SMS, WhatsApp, push, and digests are out of scope.

Pipeline:

1. User configures alert preference for a group subscription.
2. Pass predictions are available in cache.
3. Vercel Cron calls `/api/cron/alerts` every 15 minutes.
4. Cron route verifies `CRON_SECRET`.
5. Scheduler finds passes entering alert lead windows.
6. Scheduler attempts to insert a pending delivery record with the dedupe key.
7. If insert succeeds, send email through Resend.
8. Mark delivery as sent, skipped, or failed.
9. If insert conflicts, skip because another run already claimed/sent it.

Delivery record should include:

- user ID.
- group ID.
- pass prediction ID.
- channel.
- lead minutes.
- status.
- provider message ID if sent.
- error message if failed.
- timestamps.

## README and Submission Plan

Before submission, README must answer:

- What SurfPass is.
- What is deployed and where.
- Test account credentials.
- How to run locally.
- How to configure env vars.
- How to apply Supabase migration.
- Which APIs are used.
- How N2YO caching works.
- How provider failures degrade.
- How group subscriptions, RSVP, and alerts model shared state.
- How cron alert dedupe works.
- Known limitations.
- Assumptions and tradeoffs.
- What would be built next with more time.

Submission should be honest. Do not imply SMS, chat, weather scoring, full catalogue browsing, Doppler tools, maps, or real-time collaboration exist unless they are actually implemented.

## Known Risks

- N2YO transaction limits can block demos if caching is not implemented early.
- Empty placeholders make the repo look more complete than it is; implementation must verify actual file content.
- RLS bugs could either leak group data or block legitimate coordination flows.
- Cron retries and concurrent invocations can duplicate alerts unless the database dedupe constraint is correct.
- `.env.local.example` is currently ignored by `.gitignore`; reviewers may lack setup guidance unless this is fixed.
- Next.js 16 API conventions differ from older versions; use local docs before implementation.
- Provider payload assumptions should be validated with real responses or saved fixtures.
- Leaflet/react-leaflet are installed, but map work can distract from the coordination thesis.
- Overly decorative visuals would weaken the assessment positioning.

## What Not To Build

Do not build these for the MVP:

- Chat.
- SMS, WhatsApp, or push notifications.
- Full satellite catalogue browser.
- Map-first tracker.
- Weather/cloud-cover scoring.
- Doppler correction.
- Rig control.
- Antenna rotator control.
- Complex sky plots.
- Social feed.
- Admin console.
- Fake demo-only pass data presented as live provider data.
- Heavy animation or decorative space visuals.

## Recommended Next Prompt

"Implement Phase 0 from `docs/codex-build-plan.md`: align the scaffold for SurfPass, fix `.env.local.example` tracking, update metadata, add the protected app layout shell only if needed, and run lint/build. Do not implement product features yet."
