import { getSupabase } from '@/lib/supabase';
import type { Category, EquipmentType } from '@/lib/categories';
import type { TrackingType } from '@/lib/exerciseMetrics';
import type { ExerciseRow } from '@/types/workout';

/** Built-in exercises (RLS-visible to all) plus the current user's custom ones. */
export async function fetchExercises(): Promise<ExerciseRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ExerciseRow[];
}

export interface CreateExerciseInput {
  name: string;
  category: Category;
  equipmentType: EquipmentType;
  trackingType: TrackingType;
}

export async function createCustomExercise(input: CreateExerciseInput): Promise<ExerciseRow> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to add an exercise.');

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      category: input.category,
      equipment_type: input.equipmentType,
      tracking_type: input.trackingType,
      is_custom: true,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('You already have an exercise with that name.');
    throw new Error(error.message);
  }
  return data as ExerciseRow;
}

export async function deleteCustomExercise(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('exercises').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
