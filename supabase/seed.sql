-- Global catalogue seed only.
-- Reviewer/user-specific data is prepared with scripts/seed-reviewer-data.ts
-- after a Supabase Auth user exists.

insert into public.satellites (
  norad_id,
  name,
  category,
  description,
  is_curated
) values
  (
    25544,
    'ISS',
    'visual/radio',
    'International Space Station. Useful for bright visual passes and amateur radio activity.',
    true
  ),
  (
    20580,
    'Hubble',
    'visual',
    'Hubble Space Telescope. Useful for visual spotting passes.',
    true
  ),
  (
    28654,
    'NOAA 18',
    'weather',
    'NOAA polar-orbiting weather satellite used by image downlink operators.',
    true
  ),
  (
    33591,
    'NOAA 19',
    'weather',
    'NOAA polar-orbiting weather satellite used by image downlink operators.',
    true
  ),
  (
    27607,
    'SO-50',
    'amateur radio',
    'SaudiSat-1C amateur radio FM satellite.',
    true
  ),
  (
    43017,
    'AO-91',
    'amateur radio',
    'RadFxSat / AO-91 amateur radio FM satellite.',
    true
  )
on conflict (norad_id) do update
set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  is_curated = excluded.is_curated,
  updated_at = now();
