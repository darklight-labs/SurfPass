# SurfPass Design System

## Direction

SurfPass should feel like a Swiss operational console: calm, precise, structured, typographic, and data-forward.

The app is not a decorative space dashboard. It is a coordination tool for short satellite pass opportunities. The surface should prioritise legibility, hierarchy, timing, shared state, and action.

## Visual principles

- Strong typographic hierarchy.
- Neutral palette: white, black, graphite, slate, zinc, warm grey.
- Minimal accent colour, used only for action/state.
- Fine borders and grid structure.
- Dense but breathable layouts.
- Cards should feel like operational records, not marketing panels.
- Primary cards, forms, badges, and alerts use an 8px radius unless a primitive
  requires a smaller internal control radius.
- Avoid gradients, neon space tropes, glassmorphism, and gimmicky sci-fi styling.
- Use icons sparingly and only where they clarify meaning.

## Core components

- AppShell
- SidebarNav
- PageHeader
- SectionBlock
- MetricCard
- PassCard
- PassTimeline
- PassSkyArc
- ElevationIndicator
- PassScoreBadge
- DirectionPath
- RsvpSummary
- EmptyState
- StaleCacheAlert

## UI language

Use clear operational labels:

- Next good pass
- Visible pass
- Radio pass
- Max elevation
- Direction path
- Alert scheduled
- Best moment
- Group readiness
- Cached provider data
- RSVP
- Refresh passes
- Stale provider data

## Tone

Direct, calm, precise.

Bad: "Explore the cosmos with magical satellite tracking."
Good: "ISS visible pass tonight at 19:42. Excellent. 68° max elevation. 3 going."

## Pass visualisation

SurfPass uses lightweight pass visualisation inside the pass card before adding
maps. The action-critical question is whether a short window is worth acting on,
not where an object is on a decorative tracker.

- PassTimeline shows start, best moment, end, and total window length.
- PassSkyArc shows the start -> max -> end compass path as an abstract sky arc.
- ElevationIndicator shows max elevation against 0°, 30°, 60°, and 90° reference
  points.
- The visualisation uses existing cached `pass_predictions` fields only.
- It must remain clearly labelled as an operational summary, not a precise map,
  ground track, or real-time sky plot.

## Layout

Use a dashboard shell:

- Left navigation
- Main content grid
- Page header with primary action
- Cards for high-priority operational objects
- Tables for secondary records
- Empty states that explain the next action

## Interaction standards

- Every loading state must be visible.
- Every API failure must be explained.
- Every destructive action needs confirmation.
- Every provider-backed dataset should show fetched/stale status.
- Alert actions should confirm whether a notification is scheduled, sent, skipped, or failed.
