import { getLocalState, markDeleted, markPending, newId, updateLocalState } from '@/lib/localStore';
import type { Category, EquipmentType } from '@/lib/categories';
import type { TrackingType } from '@/lib/exerciseMetrics';
import type { ExerciseRow } from '@/types/workout';

/** Built-in exercises plus the user's custom ones, read from this device. */
export async function fetchExercises(): Promise<ExerciseRow[]> {
  return Object.values(getLocalState().exercises).sort((a, b) => a.name.localeCompare(b.name));
}

export interface CreateExerciseInput {
  name: string;
  category: Category;
  equipmentType: EquipmentType;
  trackingType: TrackingType;
}

/** Create a custom exercise on this device. Queued for the next sync. */
export async function createCustomExercise(input: CreateExerciseInput): Promise<ExerciseRow> {
  const name = input.name.trim();
  const state = getLocalState();
  const duplicate = Object.values(state.exercises).some(
    (e) => e.user_id != null && e.name.toLowerCase() === name.toLowerCase(),
  );
  if (duplicate) throw new Error('You already have an exercise with that name.');

  const row: ExerciseRow = {
    id: newId(),
    user_id: state.userId,
    name,
    category: input.category,
    equipment_type: input.equipmentType,
    tracking_type: input.trackingType,
    is_custom: true,
    created_at: new Date().toISOString(),
  };

  updateLocalState((s) =>
    markPending({ ...s, exercises: { ...s.exercises, [row.id]: row } }, 'exercises', row.id),
  );
  return row;
}

export async function deleteCustomExercise(id: string): Promise<void> {
  updateLocalState((s) => {
    const { [id]: _drop, ...rest } = s.exercises;
    void _drop;
    return markDeleted({ ...s, exercises: rest }, 'exercises', id);
  });
}
