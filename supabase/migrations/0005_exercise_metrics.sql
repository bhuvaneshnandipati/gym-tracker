-- ============================================================================
-- Migration 0005 — Per-exercise tracking types and metric columns
-- Adds support for cardio (duration/distance/speed/incline/calories) and
-- duration-only holds (e.g. Plank), alongside the existing weight × reps.
-- Additive and idempotent: safe to run on an existing database.
-- ============================================================================

-- tracking_type on the library and the per-workout snapshot.
alter table public.exercises
  add column if not exists tracking_type text not null default 'weight_reps'
  check (tracking_type in ('weight_reps', 'reps', 'duration', 'cardio'));

alter table public.workout_exercises
  add column if not exists tracking_type text not null default 'weight_reps'
  check (tracking_type in ('weight_reps', 'reps', 'duration', 'cardio'));

-- Extra metric columns on sets (all nullable; weight/reps already exist).
alter table public.sets
  add column if not exists duration_seconds integer check (duration_seconds is null or duration_seconds >= 0);
alter table public.sets
  add column if not exists distance numeric(8, 2) check (distance is null or distance >= 0);
alter table public.sets
  add column if not exists speed numeric(6, 2) check (speed is null or speed >= 0);
alter table public.sets
  add column if not exists incline numeric(5, 2) check (incline is null or incline >= 0);
alter table public.sets
  add column if not exists calories integer check (calories is null or calories >= 0);

-- ----------------------------------------------------------------------------
-- Classify the built-in (global) library so seeded exercises track correctly.
-- ----------------------------------------------------------------------------
-- Cardio machines.
update public.exercises
  set tracking_type = 'cardio'
  where user_id is null and category = 'cardio';

-- Duration holds.
update public.exercises
  set tracking_type = 'duration'
  where user_id is null and name = 'Plank';

-- Bodyweight rep movements (no external load).
update public.exercises
  set tracking_type = 'reps'
  where user_id is null and name in ('Hanging Leg Raise');

-- Everything else stays 'weight_reps' (the column default).
