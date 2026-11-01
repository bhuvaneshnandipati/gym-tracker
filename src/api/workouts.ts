import { getLocalState, markDeleted, markPending, newId, updateLocalState } from '@/lib/localStore';
import type { Category, EquipmentType, WeightUnit } from '@/lib/categories';
import type { TrackingType } from '@/lib/exerciseMetrics';
import type {
  WorkoutRow,
  WorkoutWithExercises,
  WorkoutExerciseWithSets,
  SetRow,
} from '@/types/workout';

export interface SaveSetInput {
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distance: number | null;
  speed: number | null;
  incline: number | null;
  calories: number | null;
}

export interface SaveExerciseInput {
  exerciseId: string | null;
  name: string;
  category: Category;
  equipmentType: EquipmentType;
  weightUnit: WeightUnit;
  trackingType: TrackingType;
  notes: string | null;
  sets: SaveSetInput[];
}

export interface SaveWorkoutInput {
  id?: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  durationSeconds: number | null;
  notes: string | null;
  exercises: SaveExerciseInput[];
}

/**
 * Save a workout and its exercises + sets on this device.
 *
 * Works fully offline. The change is queued and only reaches the database when
 * the user presses "Sync to cloud" (src/lib/cloudSync.ts).
 */
export async function saveWorkout(input: SaveWorkoutInput): Promise<string> {
  const now = new Date().toISOString();
  let savedId = '';

  updateLocalState((s) => {
    const existing = input.id ? s.workouts[input.id] : undefined;
    const workoutId = existing?.id ?? input.id ?? newId();
    savedId = workoutId;

    const exercises: WorkoutExerciseWithSets[] = input.exercises.map((ex, i) => {
      const weId = newId();
      return {
        id: weId,
        workout_id: workoutId,
        exercise_id: ex.exerciseId,
        name: ex.name,
        category: ex.category,
        equipment_type: ex.equipmentType,
        weight_unit: ex.weightUnit,
        tracking_type: ex.trackingType,
        notes: ex.notes,
        position: i,
        created_at: now,
        sets: ex.sets.map(
          (set, j): SetRow => ({
            id: newId(),
            workout_exercise_id: weId,
            weight: set.weight,
            reps: set.reps,
            duration_seconds: set.durationSeconds,
            distance: set.distance,
            speed: set.speed,
            incline: set.incline,
            calories: set.calories,
            completed: true,
            position: j,
            created_at: now,
          }),
        ),
      };
    });

    const workout: WorkoutWithExercises = {
      id: workoutId,
      user_id: s.userId,
      date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      duration_seconds: input.durationSeconds,
      notes: input.notes,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      exercises,
    };

    return markPending(
      { ...s, workouts: { ...s.workouts, [workoutId]: workout } },
      'workouts',
      workoutId,
    );
  });

  return savedId;
}

/** Newest first: by date, then by creation time. */
export function compareWorkouts(a: WorkoutRow, b: WorkoutRow): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
  return 0;
}

export async function fetchWorkout(id: string): Promise<WorkoutWithExercises> {
  const workout = getLocalState().workouts[id];
  if (!workout) throw new Error('Workout not found.');
  return workout;
}

/** Most recent workout (by date, then created_at), or null. */
export async function fetchLastWorkout(): Promise<WorkoutWithExercises | null> {
  return (await fetchWorkouts())[0] ?? null;
}

/** All workouts for the user, newest first. */
export async function fetchWorkouts(): Promise<WorkoutWithExercises[]> {
  return Object.values(getLocalState().workouts).sort(compareWorkouts);
}

export async function deleteWorkout(id: string): Promise<void> {
  updateLocalState((s) => {
    const { [id]: _drop, ...rest } = s.workouts;
    void _drop;
    return markDeleted({ ...s, workouts: rest }, 'workouts', id);
  });
}

/** Copy an existing workout to a new one dated today. Returns the new id. */
export async function duplicateWorkout(id: string): Promise<string> {
  const source = await fetchWorkout(id);
  return saveWorkout({
    date: new Date().toISOString().slice(0, 10),
    startTime: null,
    endTime: null,
    durationSeconds: null,
    notes: source.notes,
    exercises: source.exercises.map((ex) => ({
      exerciseId: ex.exercise_id,
      name: ex.name,
      category: ex.category,
      equipmentType: ex.equipment_type,
      weightUnit: ex.weight_unit,
      trackingType: ex.tracking_type,
      notes: ex.notes,
      sets: ex.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        durationSeconds: s.duration_seconds,
        distance: s.distance,
        speed: s.speed,
        incline: s.incline,
        calories: s.calories,
      })),
    })),
  });
}
