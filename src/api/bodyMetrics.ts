import { getSupabase } from '@/lib/supabase';
import type { BodyMetricRow } from '@/types/workout';

export interface SaveBodyMetricInput {
  date: string;
  weight: number | null;
  bodyFat: number | null;
  chest: number | null;
  waist: number | null;
  arms: number | null;
  thighs: number | null;
  calories: number | null;
  notes: string | null;
}

/** All body-metric entries for the user, newest first. */
export async function fetchBodyMetrics(): Promise<BodyMetricRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('body_metrics')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BodyMetricRow[];
}

/** Insert or update the entry for a given date (one per day). */
export async function saveBodyMetric(input: SaveBodyMetricInput): Promise<BodyMetricRow> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to save measurements.');

  const { data, error } = await supabase
    .from('body_metrics')
    .upsert(
      {
        user_id: user.id,
        date: input.date,
        weight: input.weight,
        body_fat: input.bodyFat,
        chest: input.chest,
        waist: input.waist,
        arms: input.arms,
        thighs: input.thighs,
        calories: input.calories,
        notes: input.notes,
      },
      { onConflict: 'user_id,date' },
    )
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as BodyMetricRow;
}

export async function deleteBodyMetric(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('body_metrics').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
