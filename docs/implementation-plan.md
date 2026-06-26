# SurfPass Implementation Plan

## Phase 01 — Scaffold

- Next.js App Router
- TypeScript
- Tailwind
- Supabase utilities
- Environment validation
- Base layout

## Phase 02 — Database

- Profiles
- Locations
- Satellites
- Groups
- Group members
- Group subscriptions
- Pass predictions
- Pass RSVPs
- Alert preferences
- Notification deliveries
- API fetch logs
- RLS policies

## Phase 03 — Auth

- Login
- Signup
- Protected routes
- Profile creation

## Phase 04 — Locations

- Open-Meteo geocoding
- Save location
- List saved locations
- Default location

## Phase 05 — Satellites

- Curated satellite seed list
- Optional custom NORAD lookup
- N2YO TLE validation

## Phase 06 — Groups

- Create group
- Membership
- Add subscription
- Group detail page

## Phase 07 — Pass engine

- N2YO visual passes
- N2YO radio passes
- Normalisation
- Scoring
- Caching
- Stale fallback

## Phase 08 — Coordination

- Pass feed
- RSVP going / maybe / skipping
- RSVP counts
- User notes

## Phase 09 — Alerts

- Resend email
- Vercel cron
- Manual test trigger
- Deduplication
- Notification delivery records

## Phase 10 — Submission

- Vercel deployment
- Test account
- README completion
- Final QA
