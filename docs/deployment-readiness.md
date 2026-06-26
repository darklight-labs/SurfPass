# Deployment Readiness

SurfPass includes a local readiness checker for the final pre-submission pass.
It is a script, not a public endpoint, and it never prints raw secret values.

## Run Locally

```bash
npm run check:readiness
```

The default mode reads `process.env`, checks repository files, checks README
placeholders, validates `vercel.json`, and reports `PASS`, `WARN`, and `FAIL`.
It does not call Supabase, N2YO, Resend, or Vercel.

Use strict mode when a non-zero exit code is useful:

```bash
npm run check:readiness -- --strict
```

## Run Remote Checks

After setting `APP_BASE_URL` or `NEXT_PUBLIC_APP_URL`, run:

```bash
npm run check:readiness -- --remote
```

Remote mode only performs safe route checks:

- `GET /`
- `GET /api/cron/alerts` without authorization, expecting `401`

It does not call N2YO, does not send alert emails, and does not invoke the
manual alert route.

## What The Warnings Mean

- `Live URL still pending`: update README after Vercel deployment.
- `Test account still pending`: add final Supabase reviewer credentials before
  sending to Riivo.
- `GitHub URL appears missing`: update the submission email/checklist with the
  final repository URL.
- `local URL`: acceptable for local testing, but production submission should
  use the deployed Vercel URL.
- `--remote skipped`: normal unless you explicitly asked for remote checks.

## What Must Be Filled Before Submission

- Vercel live URL in README.
- Supabase test account email/password in README.
- All Vercel environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `N2YO_API_KEY`
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL` or `ALERT_FROM_EMAIL`
  - `CRON_SECRET`
  - `APP_BASE_URL` or `NEXT_PUBLIC_APP_URL`
- Supabase migrations applied in order.
- `supabase/seed.sql` applied.
- Reviewer data seeded or created through the app.
- Manual alert and cron alert smoke tests completed.

## Exit Codes

By default, the checker exits successfully even when it reports `FAIL`, so it can
be used during setup without interrupting the workflow. Add `--strict` to exit
non-zero when any `FAIL` check exists.
