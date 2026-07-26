import { useMemo } from 'react';
import { useWorkouts } from '@/hooks/useWorkouts';
import type { SetRow, WorkoutWithExercises } from '@/types/workout';
import type { WeightUnit } from '@/lib/categories';
import { inferTrackingType, type TrackingType } from '@/lib/exerciseMetrics';
import { estimateOneRepMax } from '@/utils/stats';

export interface ExercisePersonalRecord {
  weight: number;
  reps: number;
  oneRepMax: number;
  date: string;
}

export interface ExerciseLastSession {
  workoutId: string;
  date: string;
  sets: SetRow[];
}

export interface ExerciseHistoryEntry {
  name: string;
  unit: WeightUnit;
  trackingType: TrackingType;
  /** Number of past sessions containing this exercise. */
  sessionCount: number;
  /** Most recent session (not the personal-record session). */
  lastSession: ExerciseLastSession | null;
  /** Best stored effort by estimated 1RM. */
  pr: ExercisePersonalRecord | null;
}

export type ExerciseHistory = Map<string, ExerciseHistoryEntry>;

/**
 * Fold the full workout list into per-exercise history: most recent session,
 * session count, and personal record. Single pass, keyed by exercise name.
 */
export function buildExerciseHistory(
  workouts: WorkoutWithExercises[],
  excludeWorkoutId?: string,
): ExerciseHistory {
  const history: ExerciseHistory = new Map();

  // Newest first, matching the order the workouts query already returns.
  const ordered = [...workouts].sort(
    (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at),
  );

  for (const workout of ordered) {
    if (excludeWorkoutId && workout.id === excludeWorkoutId) continue;

    const seen = new Set<string>();

    for (const ex of workout.exercises) {
      const trackingType =
        ex.tracking_type ?? inferTrackingType(ex.category, ex.equipment_type, ex.name);

      let entry = history.get(ex.name);
      if (!entry) {
        entry = {
          name: ex.name,
          unit: ex.weight_unit ?? 'lbs',
          trackingType,
          sessionCount: 0,
          lastSession: null,
          pr: null,
        };
        history.set(ex.name, entry);
      }

      if (!seen.has(ex.name)) {
        seen.add(ex.name);
        entry.sessionCount += 1;
      }

      // First workout encountered for this name is the most recent one.
      if (!entry.lastSession) {
        entry.lastSession = { workoutId: workout.id, date: workout.date, sets: [...ex.sets] };
      } else if (entry.lastSession.workoutId === workout.id) {
        // Same exercise logged twice in that session: merge the sets.
        entry.lastSession.sets = [...entry.lastSession.sets, ...ex.sets];
      }

      for (const set of ex.sets) {
        if (set.weight == null || set.reps == null || set.weight <= 0 || set.reps <= 0) continue;
        const oneRepMax = estimateOneRepMax(set.weight, set.reps);
        if (!entry.pr || oneRepMax > entry.pr.oneRepMax) {
          entry.pr = { weight: set.weight, reps: set.reps, oneRepMax, date: workout.date };
        }
      }
    }
  }

  return history;
}

/**
 * Per-exercise history for the workout editor.
 *
 * Reuses the cached `workouts` query (shared with the dashboard, history and
 * progress pages) rather than querying per exercise, and excludes the workout
 * currently being edited so "previous" always means a different session.
 */
export function useExerciseHistory(excludeWorkoutId?: string) {
  const { data: workouts } = useWorkouts();

  return useMemo(
    () => buildExerciseHistory(workouts ?? [], excludeWorkoutId),
    [workouts, excludeWorkoutId],
  );
}
