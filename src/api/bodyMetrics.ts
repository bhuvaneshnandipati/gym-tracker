import { getLocalState, markDeleted, markPending, newId, updateLocalState } from '@/lib/localStore';
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

/** All body-metric entries for the user, newest first. Read from this device. */
export async function fetchBodyMetrics(): Promise<BodyMetricRow[]> {
  return Object.values(getLocalState().bodyMetrics).sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );
}

/**
 * Insert or update the entry for a given date (one per day), on this device.
 * Queued for the next "Sync to cloud".
 */
export async function saveBodyMetric(input: SaveBodyMetricInput): Promise<BodyMetricRow> {
  const now = new Date().toISOString();
  const state = getLocalState();
  const existing = Object.values(state.bodyMetrics).find((m) => m.date === input.date);
  const row: BodyMetricRow = {
    id: existing?.id ?? newId(),
    user_id: state.userId,
    date: input.date,
    weight: input.weight,
    body_fat: input.bodyFat,
    chest: input.chest,
    waist: input.waist,
    arms: input.arms,
    thighs: input.thighs,
    calories: input.calories,
    notes: input.notes,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  updateLocalState((s) =>
    markPending({ ...s, bodyMetrics: { ...s.bodyMetrics, [row.id]: row } }, 'bodyMetrics', row.id),
  );
  return row;
}

export async function deleteBodyMetric(id: string): Promise<void> {
  updateLocalState((s) => {
    const { [id]: _drop, ...rest } = s.bodyMetrics;
    void _drop;
    return markDeleted({ ...s, bodyMetrics: rest }, 'bodyMetrics', id);
  });
}
