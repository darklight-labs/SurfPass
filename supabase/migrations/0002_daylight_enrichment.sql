alter table public.pass_predictions
  add column if not exists daylight_label text
    check (
      daylight_label is null
      or daylight_label in (
        'daylight',
        'night',
        'civil_twilight',
        'nautical_twilight',
        'astronomical_twilight',
        'unknown'
      )
    ),
  add column if not exists daylight_context jsonb,
  add column if not exists daylight_fetched_at timestamptz;
