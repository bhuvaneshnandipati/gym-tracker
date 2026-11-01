import type { Category, EquipmentType } from '@/lib/categories';
import type { TrackingType } from '@/lib/exerciseMetrics';
import type { ExerciseRow } from '@/types/workout';

/**
 * The built-in exercise library, bundled so it is available offline before the
 * first sync. Mirrors supabase/migrations/0003_seed_exercises.sql (names,
 * categories, equipment) and 0005_exercise_metrics.sql (tracking types).
 *
 * The ids are local placeholders. On the first "Sync to cloud" they are
 * matched by name to the database's built-in rows and replaced with the real
 * ids (see `remapBuiltinIds` in src/lib/cloudSync.ts).
 */
const SEED: [string, Category, EquipmentType, TrackingType][] = [
  ['Chest Press', 'chest', 'machine', 'weight_reps'],
  ['Incline Chest Press', 'chest', 'machine', 'weight_reps'],
  ['Decline Chest Press', 'chest', 'machine', 'weight_reps'],
  ['Pec Deck', 'chest', 'machine', 'weight_reps'],
  ['Cable Fly', 'chest', 'cable', 'weight_reps'],
  ['Shoulder Press', 'shoulders', 'machine', 'weight_reps'],
  ['Lateral Raise', 'shoulders', 'free_weight', 'weight_reps'],
  ['Rear Delt Fly', 'shoulders', 'machine', 'weight_reps'],
  ['Lat Pulldown', 'back', 'cable', 'weight_reps'],
  ['Wide Grip Pulldown', 'back', 'cable', 'weight_reps'],
  ['Close Grip Pulldown', 'back', 'cable', 'weight_reps'],
  ['Seated Cable Row', 'back', 'cable', 'weight_reps'],
  ['Machine Row', 'back', 'machine', 'weight_reps'],
  ['Chest Supported Row', 'back', 'machine', 'weight_reps'],
  ['Assisted Pull-Up', 'back', 'machine', 'weight_reps'],
  ['Cable Curl', 'biceps', 'cable', 'weight_reps'],
  ['Machine Curl', 'biceps', 'machine', 'weight_reps'],
  ['Preacher Curl', 'biceps', 'machine', 'weight_reps'],
  ['Hammer Curl', 'biceps', 'free_weight', 'weight_reps'],
  ['Tricep Pushdown', 'triceps', 'cable', 'weight_reps'],
  ['Overhead Cable Extension', 'triceps', 'cable', 'weight_reps'],
  ['Dip Machine', 'triceps', 'machine', 'weight_reps'],
  ['Leg Press', 'legs', 'machine', 'weight_reps'],
  ['Hack Squat', 'legs', 'machine', 'weight_reps'],
  ['Smith Squat', 'legs', 'machine', 'weight_reps'],
  ['Leg Extension', 'legs', 'machine', 'weight_reps'],
  ['Leg Curl', 'legs', 'machine', 'weight_reps'],
  ['Romanian Deadlift', 'legs', 'free_weight', 'weight_reps'],
  ['Standing Calf Raise', 'legs', 'machine', 'weight_reps'],
  ['Seated Calf Raise', 'legs', 'machine', 'weight_reps'],
  ['Hip Abductor', 'legs', 'machine', 'weight_reps'],
  ['Hip Adductor', 'legs', 'machine', 'weight_reps'],
  ['Glute Kickback', 'legs', 'machine', 'weight_reps'],
  ['Cable Crunch', 'core', 'cable', 'weight_reps'],
  ['Ab Crunch Machine', 'core', 'machine', 'weight_reps'],
  ['Hanging Leg Raise', 'core', 'bodyweight', 'reps'],
  ['Plank', 'core', 'bodyweight', 'duration'],
  ['Treadmill', 'cardio', 'cardio', 'cardio'],
  ['Stair Climber', 'cardio', 'cardio', 'cardio'],
  ['Bike', 'cardio', 'cardio', 'cardio'],
  ['Elliptical', 'cardio', 'cardio', 'cardio'],
  ['Rowing Machine', 'cardio', 'cardio', 'cardio'],
];

/** Prefix shared by every placeholder id, so they are easy to recognise. */
export const BUILTIN_ID_PREFIX = '00000000-0000-4000-8000-';

export function isPlaceholderBuiltinId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(BUILTIN_ID_PREFIX);
}

export function bundledExercises(): ExerciseRow[] {
  return SEED.map(([name, category, equipment_type, tracking_type], i) => ({
    id: `${BUILTIN_ID_PREFIX}${String(i + 1).padStart(12, '0')}`,
    user_id: null,
    name,
    category,
    equipment_type,
    tracking_type,
    is_custom: false,
    created_at: '1970-01-01T00:00:00.000Z',
  }));
}
