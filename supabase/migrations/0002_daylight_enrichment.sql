alter table public.pass_predictions
  add column if not exists daylight_label text default 'unknown',
  add column if not exists daylight_context jsonb,
  add column if not exists daylight_fetched_at timestamptz;

alter table public.pass_predictions
  alter column daylight_label set default 'unknown';

alter table public.pass_predictions
  drop constraint if exists pass_predictions_daylight_label_check;

alter table public.pass_predictions
  add constraint pass_predictions_daylight_label_check
  check (
    daylight_label in (
      'daylight',
      'night',
      'civil_twilight',
      'nautical_twilight',
      'astronomical_twilight',
      'unknown'
    )
  );
