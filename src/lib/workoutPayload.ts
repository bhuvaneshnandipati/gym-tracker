import type { SaveWorkoutInput } from '@/api/workouts';
import { isEmptySaveSet, serializeSet, type WorkoutDraft } from '@/hooks/useWorkoutDraft';
import { combineDateTime, durationSeconds } from '@/utils/datetime';

/** The save payload without the workout id; the id is applied at save time. */
export type WorkoutPayload = Omit<SaveWorkoutInput, 'id'>;

export type BuildPayloadResult = { payload: WorkoutPayload } | { error: string };

/**
 * Convert the editor draft to an API payload, or return a validation error.
 *
 * The id is deliberately excluded so the payload signature stays stable when a
 * draft is first created (insert) and then updated (see `payloadSignature`).
 */
export function buildPayload(draft: WorkoutDraft): BuildPayloadResult {
  if (draft.exercises.length === 0) {
    return { error: 'Add at least one exercise before saving.' };
  }

  const exercises: WorkoutPayload['exercises'] = [];
  for (const ex of draft.exercises) {
    const sets = ex.sets
      .map((s) => serializeSet(s.values, ex.trackingType))
      .filter((s) => !isEmptySaveSet(s));
    if (sets.length === 0) {
      return { error: `“${ex.name}” needs at least one set with some data.` };
    }
    exercises.push({
      exerciseId: ex.exerciseId,
      name: ex.name,
      category: ex.category,
      equipmentType: ex.equipmentType,
      weightUnit: ex.weightUnit,
      trackingType: ex.trackingType,
      notes: ex.notes.trim() || null,
      sets,
    });
  }

  return {
    payload: {
      date: draft.date,
      startTime: combineDateTime(draft.date, draft.startTime),
      endTime: combineDateTime(draft.date, draft.endTime),
      // Stopwatch time (pauses excluded) wins over end − start when present.
      durationSeconds:
        draft.activeDurationSeconds ?? durationSeconds(draft.date, draft.startTime, draft.endTime),
      notes: draft.notes.trim() || null,
      exercises,
    },
  };
}

/**
 * Stable fingerprint of a payload. Auto-save compares this against the last
 * persisted fingerprint so unchanged drafts never hit the database twice.
 */
export function payloadSignature(payload: WorkoutPayload | null): string | null {
  return payload ? JSON.stringify(payload) : null;
}
