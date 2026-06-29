# Reviewer Demo Script

Use this as the shortest path through the SurfPass assessment flow.

1. Log in with the documented test account.
2. Open `/dashboard` and confirm the overview shows setup state, group readiness, and cached forecast state.
3. Open `/locations` and confirm the saved observer locations exist, or search and save one.
4. Open `/satellites` and confirm the curated catalogue is visible.
5. Open `/groups` and choose the reviewer group.
6. Inspect the primary ISS / NORAD 25544 / radio subscription: Cape Town / Signal Hill, 10° minimum elevation, 10 days ahead, and alerts enabled.
7. Click `Refresh passes` on the group page.
8. Confirm ISS radio pass cards appear with time, type, score, direction, elevation, RSVP, alert, cache, and light context. An empty optional visual subscription is valid.
9. Mark RSVP readiness as `Going`, `Maybe`, or `Skipping`.
10. Send a manual test alert with `/api/alerts/test` or the documented request flow.
11. Inspect `System evidence` on the group page for cache state, scoped provider logs, and current-user delivery records.
12. Open `/settings` and confirm alert preferences for the group.
13. Read [docs/assumptions.md](assumptions.md) and [docs/architecture-walkthrough.md](architecture-walkthrough.md) for implementation assumptions and tradeoffs.

Expected result: the reviewer can see real authenticated state, location-specific pass forecasts, shared group subscriptions, persisted RSVP state, cached provider data, deduplicated email delivery records, and honest empty/error states where configuration is incomplete.
