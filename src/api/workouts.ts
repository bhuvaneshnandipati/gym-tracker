import { getSupabase } from '@/lib/supabase';
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
 * Persist a workout and its nested exercises + sets.
 *
 * Supabase has no client-side transactions, so on update we replace the
 * children (delete + re-insert via cascade). At personal scale this is simple
 * and correct; ownership is enforced by Row Level Security on every table.
 */
export async function saveWorkout(input: SaveWorkoutInput): Promise<string> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to save a workout.');

  let workoutId = input.id;

  if (workoutId) {
    const { error } = await supabase
      .from('workouts')
      .update({
        date: input.date,
        start_time: input.startTime,
        end_time: input.endTime,
        duration_seconds: input.durationSeconds,
        notes: input.notes,
      })
      .eq('id', workoutId);
    if (error) throw new Error(error.message);

    const { error: deleteError } = await supabase
      .from('workout_exercises')
      .delete()
      .eq('workout_id', workoutId);
    if (deleteError) throw new Error(deleteError.message);
  } else {
    const { data, error } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        date: input.date,
        start_time: input.startTime,
        end_time: input.endTime,
        duration_seconds: input.durationSeconds,
        notes: input.notes,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    workoutId = data.id as string;
  }

  for (let i = 0; i < input.exercises.length; i += 1) {
    const ex = input.exercises[i];
    const { data: weRow, error: weError } = await supabase
      .from('workout_exercises')
      .insert({
        workout_id: workoutId,
        exercise_id: ex.exerciseId,
        name: ex.name,
        category: ex.category,
        equipment_type: ex.equipmentType,
        weight_unit: ex.weightUnit,
        tracking_type: ex.trackingType,
        notes: ex.notes,
        position: i,
      })
      .select('id')
      .single();
    if (weError) throw new Error(weError.message);

    if (ex.sets.length > 0) {
      const setsPayload = ex.sets.map((s, j) => ({
        workout_exercise_id: weRow.id,
        weight: s.weight,
        reps: s.reps,
        duration_seconds: s.durationSeconds,
        distance: s.distance,
        speed: s.speed,
        incline: s.incline,
        calories: s.calories,
        position: j,
        completed: true,
      }));
      const { error: setsError } = await supabase.from('sets').insert(setsPayload);
      if (setsError) throw new Error(setsError.message);
    }
  }

  return workoutId;
}

type NestedWorkout = WorkoutRow & {
  workout_exercises: (WorkoutExerciseWithSets & { sets: SetRow[] })[];
};

function shapeWorkout(row: NestedWorkout): WorkoutWithExercises {
  const exercises = [...(row.workout_exercises ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((we) => ({
      ...we,
      sets: [...(we.sets ?? [])].sort((a, b) => a.position - b.position),
    }));

  const { workout_exercises: _drop, ...workout } = row;
  void _drop;
  return { ...workout, exercises };
}

const NESTED_SELECT = '*, workout_exercises(*, sets(*))';

export async function fetchWorkout(id: string): Promise<WorkoutWithExercises> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('workouts')
    .select(NESTED_SELECT)
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return shapeWorkout(data as NestedWorkout);
}

/** Most recent workout (by date, then created_at), or null. */
export async function fetchLastWorkout(): Promise<WorkoutWithExercises | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('workouts')
    .select(NESTED_SELECT)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? shapeWorkout(data as NestedWorkout) : null;
}

/** All workouts for the user, newest first. Enriched further in Milestone 4. */
export async function fetchWorkouts(): Promise<WorkoutWithExercises[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('workouts')
    .select(NESTED_SELECT)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as NestedWorkout[]).map(shapeWorkout);
}

export async function deleteWorkout(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('workouts').delete().eq('id', id);
  if (error) throw new Error(error.message);
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
