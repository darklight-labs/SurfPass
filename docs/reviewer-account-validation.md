# Reviewer Account Validation

Use this checklist after the final Supabase project, Vercel deployment, and disposable reviewer account exist. Do not commit real secrets, service role keys, API keys, or production `.env` files.

## Account

- Test email: `[fill before submission]`
- Password: `[fill before submission]`
- Supabase user id: `[do not commit if sensitive; keep as optional local note only]`
- Disposable account confirmed: yes/no
- No personal data attached: yes/no

## Seeded Data

- Location seeded: yes/no
- Expected locations:
  - Cape Town / Signal Hill
  - Johannesburg / Observatory
- Default location is Cape Town / Signal Hill: yes/no
- Group seeded: yes/no
- Expected group: Cape Town Evening Spotters
- Group membership seeded: yes/no
- Reviewer is group owner: yes/no
- Satellites seeded: yes/no
- Expected satellites:
  - ISS, NORAD 25544
  - SO-50, NORAD 27607
- Subscriptions seeded: yes/no
- Expected subscriptions:
  - ISS radio from Cape Town / Signal Hill, 10° minimum elevation, 10 days ahead
  - ISS visual from Cape Town / Signal Hill, optional
- Alert preference enabled: yes/no
- Alert lead time is 30 minutes: yes/no

## Reviewer Flow Validation

- Incognito login tested: yes/no
- Dashboard loads after login: yes/no
- Locations page shows seeded locations: yes/no
- Satellites page shows curated catalogue: yes/no
- Groups page shows Cape Town Evening Spotters: yes/no
- Group detail page shows subscriptions: yes/no
- Pass refresh tested: yes/no
- ISS radio pass cards visible when valid radio data is returned: yes/no
- Visual zero-result state is non-fatal and clearly explained: yes/no
- RSVP tested: yes/no
- RSVP persists after reload: yes/no
- Settings alert preferences tested: yes/no
- Manual alert tested: yes/no
- Repeated manual alert dedupes: yes/no
- Cron route rejects missing token: yes/no
- Cron route rejects wrong token: yes/no
- Cron route tested with `CRON_SECRET`: yes/no
- System evidence inspected after refresh or alert test: yes/no

## Final README Update

- Live URL filled: yes/no
- Test account email filled: yes/no
- Test account password filled: yes/no
- Credentials are for disposable reviewer account only: yes/no
- `docs/submission-email.md` filled: yes/no
- Final incognito pass completed: yes/no

## Notes

- Supabase Auth users are created outside SQL, either through Supabase Auth or `/login`.
- `REVIEWER_USER_ID` is only needed locally for `npm run seed:reviewer`.
- The seed script does not call N2YO or Resend. Refresh passes and test alerts from the deployed app after seeding.
- Do not commit `.env.local`, screenshots with secrets, or real API keys.
