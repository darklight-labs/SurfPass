# ADR-003: Cache Provider Pass Data and Show Pass Cards Before Maps

## Status

Accepted for MVP.

## Context

SurfPass coordinates short satellite pass opportunities for groups. N2YO is transaction-limited, pass results are location-specific, and group members often need the same forecast for the same subscription.

The assessment should demonstrate reliable shared state, not a decorative tracker. The core question is whether a group has a useful upcoming pass and whether people can act on it.

## Decision

SurfPass caches normalised N2YO pass predictions in `pass_predictions` and keys each cached pass by satellite, location, pass type, and start time.

Group refresh is explicit and on demand. A refresh checks `group_subscriptions`, reuses cache younger than six hours, and calls N2YO only for stale or missing subscription data.

The group feed presents pass cards before any map or sky plot. Cards translate provider data into start time, peak time, max elevation, direction path, duration, score, alert state, RSVP readiness state, and cache state.

## Consequences

- Provider transactions are protected because page loads do not call N2YO.
- Group members share the same cached pass windows instead of producing duplicate user-specific fetches.
- Provider failures degrade to stale cached data when available.
- The UI stays operational and coordination-first.
- Maps and sky plots remain future enhancements, not the primary product surface.

## Alternatives Considered

- Fetch N2YO on every group page load. Rejected because it is wasteful, fragile, and likely to rate-limit the demo.
- Store raw provider responses only. Rejected because UI and alerts need stable, provider-independent fields.
- Lead with a map. Rejected because SurfPass is a coordination console; the first user question is the next useful pass, not the satellite's current position.
