# SurfPass Submission Checklist

Use this as the final pre-send checklist. Do not send the assessment until every production-specific value has been filled in and verified.

## Submission Links

- [ ] GitHub repo URL: `PENDING`
- [ ] Vercel live URL: `PENDING`
- [ ] Test account email: `PENDING`
- [ ] Test account password: `PENDING`

## Platform Configuration

- [ ] Supabase project configured
- [ ] Supabase email/password auth enabled
- [ ] Supabase migrations applied in order from `supabase/migrations`
- [ ] Curated satellites seeded from `supabase/seed.sql`
- [ ] Vercel env vars configured
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configured
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured
- [ ] `N2YO_API_KEY` configured
- [ ] `RESEND_API_KEY` configured
- [ ] `RESEND_FROM_EMAIL` configured
- [ ] Resend sender verified
- [ ] `CRON_SECRET` configured
- [ ] `NEXT_PUBLIC_APP_URL` configured with the live URL
- [ ] `APP_BASE_URL` configured with the live URL

## Reviewer Data

- [ ] Test account created
- [ ] Test account seeded with `npm run seed:reviewer` or equivalent manual setup
- [ ] `docs/reviewer-account-validation.md` completed without secrets
- [ ] Saved locations present: Cape Town / Signal Hill and Johannesburg / Observatory
- [ ] Satellite catalogue present, including ISS and SO-50
- [ ] Group present
- [ ] Group membership present
- [ ] Group subscriptions present: ISS visual and SO-50 radio
- [ ] Alert preference enabled

## Reviewer Flow QA

- [ ] Incognito sign-in tested with reviewer account
- [ ] Dashboard loads
- [ ] Locations page loads and seeded locations are visible
- [ ] Satellites page loads and curated catalogue is visible
- [ ] Groups page loads and group is visible
- [ ] Group detail page loads
- [ ] Subscriptions are visible
- [ ] Pass refresh tested
- [ ] Pass cards visible after refresh or clear provider/cache state shown
- [ ] RSVP tested
- [ ] Settings alert preferences tested
- [ ] Manual alert tested
- [ ] Cron route rejects missing/wrong token
- [ ] Cron route tested with `CRON_SECRET`

## Repository QA

- [ ] README updated with live URL
- [ ] README updated with test account
- [ ] README truth-checked against implemented functionality
- [ ] `docs/architecture-walkthrough.md` checked
- [ ] `docs/decision-records.md` checked
- [ ] `docs/reviewer-demo-script.md` checked
- [ ] `docs/reviewer-account-validation.md` checked
- [ ] `docs/reviewer-flow.md` checked
- [ ] `docs/test-account-setup.md` checked
- [ ] `docs/final-decision-records.md` checked
- [ ] `docs/submission-email.md` filled with links and credentials
- [ ] Final intended files committed and pushed to GitHub
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] No legacy pass-window type references remain
- [ ] No real secrets committed
- [ ] `.env.local` is not committed
- [ ] Final incognito test completed
