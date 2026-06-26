# ADR-002: Group Subscriptions As The Shared-State Centre

## Status

Accepted for MVP.

## Context

SurfPass needs to model coordination around the same future satellite pass, not independent personal lookups.

## Decision

`group_subscriptions` is the centre of the data model. It connects the group, observer location, satellite, pass type, thresholds, days-ahead window, and alert intent.

## Consequences

- A group has one durable definition of what it watches.
- Cached pass predictions, RSVPs, alert preferences, and notification deliveries can be reasoned about from shared subscription context.
- Duplicate watch definitions are prevented with a database uniqueness constraint.
