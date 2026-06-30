-- ============================================================================
-- Migration 0002 — Workouts, exercise library, workout exercises, and sets
-- Run after 0001_profiles.sql. Apply in the Supabase SQL editor or via the CLI.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- exercises: the exercise library.
--   user_id IS NULL  -> built-in / global exercise (readable by everyone)
--   user_id = a user -> that user's custom exercise
-- ----------------------------------------------------------------------------
create table if not exists public.exercises (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 80),
  category       text not null default 'other'
                 check (category in ('chest','back','shoulders','biceps','triceps','legs','core','cardio','other')),
  equipment_type text not null default 'other'
                 check (equipment_type in ('machine','free_weight','cable','bodyweight','cardio','other')),
  is_custom      boolean not null default true,
  created_at     timestamptz not null default now()
);

comment on table public.exercises is 'Exercise library: global (user_id null) + per-user custom.';

-- Unique names within the global set and within each user's set (case-insensitive).
create unique index if not exists exercises_global_name_key
  on public.exercises (lower(name)) where user_id is null;
create unique index if not exists exercises_user_name_key
  on public.exercises (user_id, lower(name)) where user_id is not null;
create index if not exists exercises_user_id_idx on public.exercises (user_id);

-- ----------------------------------------------------------------------------
-- workouts: one gym session. start_time / end_time are stored as full
-- timestamps (ISO) so durations compute cleanly across edge cases.
-- ----------------------------------------------------------------------------
create table if not exists public.workouts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  date             date not null default current_date,
  start_time       timestamptz,
  end_time         timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists workouts_user_date_idx on public.workouts (user_id, date desc);

drop trigger if exists workouts_set_updated_at on public.workouts;
create trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- workout_exercises: an exercise performed within a workout. Stores a snapshot
-- of name/category/equipment so later library edits never alter past history.
-- exercise_id links back to the library (nullable). Ownership is derived from
-- the parent workout via RLS, so no user_id column is needed here.
-- ----------------------------------------------------------------------------
create table if not exists public.workout_exercises (
  id             uuid primary key default gen_random_uuid(),
  workout_id     uuid not null references public.workouts (id) on delete cascade,
  exercise_id    uuid references public.exercises (id) on delete set null,
  name           text not null,
  category       text not null default 'other',
  equipment_type text not null default 'other',
  weight_unit    text not null default 'lbs' check (weight_unit in ('lbs','kg')),
  notes          text,
  position       integer not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists workout_exercises_workout_idx
  on public.workout_exercises (workout_id, position);
create index if not exists workout_exercises_exercise_idx
  on public.workout_exercises (exercise_id);

-- ----------------------------------------------------------------------------
-- sets: one set within a workout exercise. Ownership derives from the parent.
-- ----------------------------------------------------------------------------
create table if not exists public.sets (
  id                  uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  weight              numeric(7, 2) check (weight is null or weight >= 0),
  reps                integer check (reps is null or reps >= 0),
  completed           boolean not null default true,
  position            integer not null default 0,
  created_at          timestamptz not null default now()
);

create index if not exists sets_workout_exercise_idx
  on public.sets (workout_exercise_id, position);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.exercises         enable row level security;
alter table public.workouts          enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.sets              enable row level security;

-- exercises: everyone reads globals + their own; writes only their own customs.
drop policy if exists "Read global and own exercises" on public.exercises;
create policy "Read global and own exercises"
  on public.exercises for select
  using (user_id is null or auth.uid() = user_id);

drop policy if exists "Insert own exercises" on public.exercises;
create policy "Insert own exercises"
  on public.exercises for insert
  with check (auth.uid() = user_id);

drop policy if exists "Update own exercises" on public.exercises;
create policy "Update own exercises"
  on public.exercises for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Delete own exercises" on public.exercises;
create policy "Delete own exercises"
  on public.exercises for delete
  using (auth.uid() = user_id);

-- workouts: owner-only on every action.
drop policy if exists "Select own workouts" on public.workouts;
create policy "Select own workouts" on public.workouts for select using (auth.uid() = user_id);
drop policy if exists "Insert own workouts" on public.workouts;
create policy "Insert own workouts" on public.workouts for insert with check (auth.uid() = user_id);
drop policy if exists "Update own workouts" on public.workouts;
create policy "Update own workouts" on public.workouts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Delete own workouts" on public.workouts;
create policy "Delete own workouts" on public.workouts for delete using (auth.uid() = user_id);

-- workout_exercises: access derived from the parent workout's owner.
drop policy if exists "Access own workout_exercises" on public.workout_exercises;
create policy "Access own workout_exercises"
  on public.workout_exercises for all
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id and w.user_id = auth.uid()
    )
  );

-- sets: access derived through workout_exercises -> workouts.
drop policy if exists "Access own sets" on public.sets;
create policy "Access own sets"
  on public.sets for all
  using (
    exists (
      select 1
      from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = sets.workout_exercise_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = sets.workout_exercise_id and w.user_id = auth.uid()
    )
  );
