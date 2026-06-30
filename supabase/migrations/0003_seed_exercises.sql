-- ============================================================================
-- Migration 0003 — Seed the built-in exercise library
-- Idempotent: re-running will not create duplicates.
-- Run after 0002_workouts.sql.
-- ============================================================================

insert into public.exercises (name, category, equipment_type, user_id, is_custom)
select v.name, v.category, v.equipment_type, null, false
from (
  values
    -- Chest
    ('Chest Press',            'chest',     'machine'),
    ('Incline Chest Press',    'chest',     'machine'),
    ('Decline Chest Press',    'chest',     'machine'),
    ('Pec Deck',               'chest',     'machine'),
    ('Cable Fly',              'chest',     'cable'),
    -- Shoulders
    ('Shoulder Press',         'shoulders', 'machine'),
    ('Lateral Raise',          'shoulders', 'free_weight'),
    ('Rear Delt Fly',          'shoulders', 'machine'),
    -- Back
    ('Lat Pulldown',           'back',      'cable'),
    ('Wide Grip Pulldown',     'back',      'cable'),
    ('Close Grip Pulldown',    'back',      'cable'),
    ('Seated Cable Row',       'back',      'cable'),
    ('Machine Row',            'back',      'machine'),
    ('Chest Supported Row',    'back',      'machine'),
    ('Assisted Pull-Up',       'back',      'machine'),
    -- Biceps
    ('Cable Curl',             'biceps',    'cable'),
    ('Machine Curl',           'biceps',    'machine'),
    ('Preacher Curl',          'biceps',    'machine'),
    ('Hammer Curl',            'biceps',    'free_weight'),
    -- Triceps
    ('Tricep Pushdown',        'triceps',   'cable'),
    ('Overhead Cable Extension','triceps',  'cable'),
    ('Dip Machine',            'triceps',   'machine'),
    -- Legs
    ('Leg Press',              'legs',      'machine'),
    ('Hack Squat',             'legs',      'machine'),
    ('Smith Squat',            'legs',      'machine'),
    ('Leg Extension',          'legs',      'machine'),
    ('Leg Curl',               'legs',      'machine'),
    ('Romanian Deadlift',      'legs',      'free_weight'),
    ('Standing Calf Raise',    'legs',      'machine'),
    ('Seated Calf Raise',      'legs',      'machine'),
    ('Hip Abductor',           'legs',      'machine'),
    ('Hip Adductor',           'legs',      'machine'),
    ('Glute Kickback',         'legs',      'machine'),
    -- Core
    ('Cable Crunch',           'core',      'cable'),
    ('Ab Crunch Machine',      'core',      'machine'),
    ('Hanging Leg Raise',      'core',      'bodyweight'),
    ('Plank',                  'core',      'bodyweight'),
    -- Cardio
    ('Treadmill',              'cardio',    'cardio'),
    ('Stair Climber',          'cardio',    'cardio'),
    ('Bike',                   'cardio',    'cardio'),
    ('Elliptical',             'cardio',    'cardio'),
    ('Rowing Machine',         'cardio',    'cardio')
) as v (name, category, equipment_type)
where not exists (
  select 1 from public.exercises e
  where e.user_id is null and lower(e.name) = lower(v.name)
);
