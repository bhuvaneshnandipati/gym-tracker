/**
 * Glue between the workout stopwatch and the workout editor.
 * Kept free of React so it can be unit-tested.
 */
import { stopwatchElapsedMs, type StopwatchState } from '@/lib/timerEngine';
import { timeFromISO } from '@/utils/datetime';

/** HH:MM (local) for an epoch timestamp. */
export function epochToHHMM(ms: number): string {
  return timeFromISO(new Date(ms).toISOString());
}

/**
 * Whether the app-wide workout stopwatch belongs to the workout being edited:
 * either it is already linked to this saved workout, or this is a brand-new
 * workout and the stopwatch isn't linked to a different one.
 */
export function stopwatchBelongsTo(
  sw: StopwatchState,
  workoutId: string | undefined,
  startedNew: boolean,
): boolean {
  if (sw.status === 'idle') return false;
  if (workoutId && sw.linkedWorkoutId === workoutId) return true;
  return startedNew && (sw.linkedWorkoutId == null || sw.linkedWorkoutId === workoutId);
}

export interface SessionPatch {
  startTime?: string;
  endTime?: string;
  activeDurationSeconds: number;
}

/**
 * Values to write onto the draft when a workout timed by the stopwatch is
 * saved: the active duration (pauses excluded), plus start/end times for any
 * of those fields the user left empty.
 */
export function sessionPatchFromStopwatch(
  sw: StopwatchState,
  draft: { startTime: string; endTime: string },
  now: number,
): SessionPatch {
  const patch: SessionPatch = {
    activeDurationSeconds: Math.max(0, Math.round(stopwatchElapsedMs(sw, now) / 1000)),
  };
  if (!draft.startTime && sw.firstStartedAt != null)
    patch.startTime = epochToHHMM(sw.firstStartedAt);
  if (!draft.endTime) patch.endTime = epochToHHMM(now);
  return patch;
}
