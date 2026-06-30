import type { Category, EquipmentType, WeightUnit } from '@/lib/categories';

/** A row from public.exercises. */
export interface ExerciseRow {
  id: string;
  user_id: string | null;
  name: string;
  category: Category;
  equipment_type: EquipmentType;
  is_custom: boolean;
  created_at: string;
}

/** A row from public.workouts. */
export interface WorkoutRow {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** A row from public.workout_exercises. */
export interface WorkoutExerciseRow {
  id: string;
  workout_id: string;
  exercise_id: string | null;
  name: string;
  category: Category;
  equipment_type: EquipmentType;
  weight_unit: WeightUnit;
  notes: string | null;
  position: number;
  created_at: string;
}

/** A row from public.sets. */
export interface SetRow {
  id: string;
  workout_exercise_id: string;
  weight: number | null;
  reps: number | null;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface WorkoutExerciseWithSets extends WorkoutExerciseRow {
  sets: SetRow[];
}

export interface WorkoutWithExercises extends WorkoutRow {
  exercises: WorkoutExerciseWithSets[];
}

/** A row from public.body_metrics. */
export interface BodyMetricRow {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  weight: number | null;
  body_fat: number | null;
  chest: number | null;
  waist: number | null;
  arms: number | null;
  thighs: number | null;
  calories: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
