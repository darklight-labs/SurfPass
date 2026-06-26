# SurfPass Design Note

SurfPass is designed as an operational coordination console for short satellite pass windows. The key product question is not "where is the satellite right now?" but "what is the next useful pass, is it worth acting on, who is going, and will the group be alerted in time?"

The UI intentionally avoids decorative space imagery, gradients, neon, fake 3D, and map-first composition. The assessment build uses a Swiss visual language: large typographic page headers, small uppercase operational labels, fine borders, restrained state colour, compact cards, and tables where comparison matters.

Pass cards are the primary product surface. They show satellite, pass type, start/best/end times, max elevation, direction path, duration, score, RSVP counts, current user readiness, alert state, and cache state. Maps and sky plots can be added later, but they should not replace the operational summary.

Groups and group subscriptions are treated as the centre of the shared workflow. RSVP comes before chat because readiness is structured and reviewable. Email comes before SMS because it proves the alert pipeline with less delivery and compliance complexity.

The final finish should feel calm, precise, and trustworthy: a console an amateur radio operator or satellite spotter could leave open while preparing for the next short window.
