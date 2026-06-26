# SurfPass Final QA Report

## Date/time

2026-06-25T22:14:08+02:00

## Commands run

- `cat package.json`
- `npm run lint`
- `npm run build`
- Legacy pass-window naming search excluding `node_modules`, `.next`, `.git`, and `.tmp`
- Secret-pattern search for populated `N2YO_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Stale-copy search for TODO/FIXME/mock/demo/implemented-later signals
- SurfPass naming search
- Internal link scan across `src/app` and `src/components`
- Server/client boundary scan for service-role and provider secret imports
- Local route smoke with `curl`

## Results

- `npm run lint` passed.
- `npm run build` passed.
- No legacy pass-window type references were found.
- No populated secret values were found in committed files.
- No stale mock/demo data is presented as live data.
- README keeps live URL and test account placeholders explicit.
- `docs/submission-checklist.md` accurately reflects remaining submission work.
- SurfPass naming is consistent. Lowercase `surfpass` appears only where appropriate, such as package name and alert idempotency keys.

## Route QA

Public routes:

- `/` returned `200`.
- `/login` returned `200`.

Protected routes without a session:

- `/dashboard` redirected to `/login` with `307`.
- `/locations` redirected to `/login` with `307`.
- `/satellites` redirected to `/login` with `307`.
- `/groups` redirected to `/login` with `307`.
- `/groups/new` redirected to `/login` with `307`.
- `/groups/00000000-0000-0000-0000-000000000000` redirected to `/login` with `307`.
- `/settings` redirected to `/login` with `307`.

API routes:

- `GET /api/geocode` without `q` returned `400` with a clear validation message.
- `GET /api/geocode?q=Cape%20Town` returned `200` with normalised Open-Meteo results.
- `POST /api/satellites/custom` without a session returned `401`.
- `POST /api/groups/[id]/refresh-passes` without a session returned `401`.
- `POST /api/passes/[id]/rsvp` without a session returned `401`.
- `POST /api/alerts/test` without a session returned `401`.
- `GET /api/cron/alerts` with no local `CRON_SECRET` returned `500` with a clear setup error.

## Issues found

No blocking code, route, lint, build, or documentation-truth issues were found in this pass.

Expected non-blocking findings:

- Cron wrong-token behavior was code-inspected, but the local running server had no `CRON_SECRET`, so the live local response was the expected setup error.
- Authenticated reviewer-path QA still requires the final Supabase project, seeded reviewer account, N2YO key, and Resend sender.

## Fixes made

- Added this final QA report.
- No application code changes were required during this sweep.

## Remaining risks

- N2YO free-tier limits may affect pass refresh during review.
- Cron reads cached predictions only; reviewer data must be refreshed from a group page before scheduled alerts can fire.
- Email delivery depends on verified Resend sender configuration.
- Reviewer account and seeded data still need final hosted Supabase setup.
- Manual alert and cron delivery need final deployed-environment QA.

## Manual deployment steps still required

1. Deploy the GitHub repository to Vercel.
2. Configure Vercel env vars from `.env.local.example`.
3. Apply all SQL files in `supabase/migrations` in order.
4. Run `supabase/seed.sql`.
5. Create the final Supabase reviewer test account.
6. Seed reviewer data with `npm run seed:reviewer` or the documented manual path.
7. Sign in through the deployed app in an incognito browser.
8. Refresh passes from the seeded group page.
9. RSVP to at least one pass when pass cards are available.
10. Confirm alert preferences in `/settings`.
11. Send one manual test alert.
12. Test `/api/cron/alerts` with and without `CRON_SECRET`.
13. Update `README.md` with the live URL and test account.
14. Fill `docs/submission-email.md`.
