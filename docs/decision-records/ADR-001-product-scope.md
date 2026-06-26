# ADR-001: Coordination-First Product Scope

## Status

Accepted for MVP.

## Context

Satellite passes are short, local windows. They become useful only when the pass is good enough for a person or group to act on.

## Decision

SurfPass is a coordination console, not a decorative tracker. The core workflow is: save an observer location, create or join a group, define what the group watches, refresh cached pass data, RSVP, and receive a deduplicated email alert.

## Consequences

- The product prioritises shared state over map decoration.
- Group subscriptions, pass cards, RSVP state, and alerts are the main product surface.
- Chat, live global tracking, and broad catalogue browsing stay out of MVP scope.
