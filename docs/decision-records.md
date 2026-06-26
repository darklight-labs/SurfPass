# SurfPass Decision Records

## ADR 001: SurfPass Framing

Status: Accepted.

SurfPass is a coordination app for short satellite pass opportunities, not a decorative tracker. The workflow is location -> group subscription -> cached pass forecast -> RSVP -> alert. This framing keeps implementation effort focused on shared state and reliability.

## ADR 002: Group Subscriptions As Shared-State Centre

Status: Accepted.

`group_subscriptions` models what a group watches: group, location, satellite, pass type, thresholds, days ahead, and alert intent. This gives the app a durable coordination object and prevents the forecast from becoming isolated per-user data.

## ADR 003: Pass Cards Before Maps

Status: Accepted.

Pass cards answer the operational questions first: when, type, quality, direction, duration, RSVP, alert state, and cache state. Maps and sky plots can be added later, but they are not the fastest path to knowing whether a pass is worth acting on.

## ADR 004: Provider Cache

Status: Accepted.

N2YO is transaction-limited and pass results are shared by group members. SurfPass caches normalised provider data in `pass_predictions`, reuses fresh cache, and degrades to stale cache when live refresh fails.

## ADR 005: RSVP Before Chat

Status: Accepted.

Coordination is structured readiness, not conversation. `pass_rsvps` stores one readiness state per user/group/pass. Chat is out of scope because it adds noise and does not prove the core shared-state model.

## ADR 006: Email Before SMS

Status: Accepted.

Email is the MVP alert channel. It proves scheduling, delivery, and dedupe with less compliance and provider complexity than SMS or WhatsApp.

## ADR 007: Dedupe Via `notification_deliveries`

Status: Accepted.

Delivery dedupe is durable database state, unique by user, group, pass prediction, channel, and lead time. Manual and cron sends claim a pending row before sending and mark it sent only after Resend accepts the message.

## ADR 008: Cron Alerts From Cached Predictions

Status: Accepted.

The cron worker reads cached `pass_predictions`; it does not call N2YO. Pass refresh and alert delivery are separate responsibilities, which protects provider limits and makes failures easier to reason about.
