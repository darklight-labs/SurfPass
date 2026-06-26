# SurfPass Final Decision Records

## Product Framing

SurfPass is a coordination console for short satellite pass opportunities, not a decorative tracker. The primary workflow is: save an observer location, choose satellites, define a group subscription, refresh cached pass data, RSVP, and receive an email alert before the window opens.

## Data Model

The shared-state centre is `group_subscriptions`: group plus location plus satellite plus pass type plus thresholds. This gives the app a durable object that multiple users can coordinate around, and it prevents the product from becoming a personal-only satellite lookup.

RSVP state is structured in `pass_rsvps` rather than modelled as chat. Notification state is structured in `notification_deliveries` rather than inferred from the UI.

## Provider Cache

N2YO is transaction-limited, so SurfPass caches pass predictions in `pass_predictions`. Group refresh calls N2YO only when cache is missing or stale, and the dashboard reads cached Supabase state only. The cron worker never calls N2YO.

## Alert Dedupe

Email is the MVP channel. Manual and scheduled delivery both use `notification_deliveries` as the durable dedupe record, unique by user, group, pass, channel, and lead time. Delivery is claimed as pending before calling Resend and marked sent only after provider acceptance.

## UI Design

The interface uses a Swiss operational style: strong typography, thin borders, restrained colour, compact records, clear empty states, and no space wallpaper or sci-fi decoration. Pass cards come before maps because the reviewer and user need to know when the next useful window opens, how good it is, who is going, and whether alerts are ready.

## Known Limitations

- N2YO free-tier limits apply.
- Email is the only alert channel.
- Cron depends on cached predictions refreshed from group pages.
- Weather/cloud-cover scoring is not implemented.
- Full satellite catalogue browsing is not implemented.
- Invite links and member self-service are not implemented.
- Doppler/frequency metadata, rig control, maps, sky plots, and chat are out of scope.
