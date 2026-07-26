import { useMemo } from 'react';
import type { WeightUnit } from '@/lib/categories';
import { metricKeysFor, type TrackingType } from '@/lib/exerciseMetrics';
import type { DraftExercise, DraftSet } from '@/hooks/useWorkoutDraft';
import type { ExerciseHistoryEntry } from '@/hooks/useExerciseHistory';
import type { SetRow } from '@/types/workout';
import { estimateOneRepMax } from '@/utils/stats';
import { formatClock, formatDateShort } from '@/utils/datetime';

interface ExerciseInsightsProps {
  exercise: DraftExercise;
  history: ExerciseHistoryEntry | undefined;
}

const EPSILON = 0.001;

/** Trim trailing zeros so 220.0 reads as "220". */
function num(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** One human-readable line for a stored set, respecting the tracking type. */
function formatHistorySet(set: SetRow, trackingType: TrackingType, name: string): string {
  if (trackingType === 'weight_reps') {
    if (set.weight == null && set.reps == null) return '—';
    return `${set.weight != null ? num(set.weight) : '—'} × ${set.reps ?? '—'}`;
  }

  const parts: string[] = [];
  for (const key of metricKeysFor(trackingType, name)) {
    if (key === 'weight' && set.weight != null) parts.push(num(set.weight));
    if (key === 'reps' && set.reps != null) parts.push(`${set.reps} reps`);
    if (key === 'duration' && set.duration_seconds != null) {
      parts.push(
        trackingType === 'cardio'
          ? `${num(set.duration_seconds / 60)} min`
          : formatClock(set.duration_seconds),
      );
    }
    if (key === 'distance' && set.distance != null) parts.push(`${num(set.distance)} mi`);
    if (key === 'speed' && set.speed != null) parts.push(`${num(set.speed)} mph`);
    if (key === 'incline' && set.incline != null) parts.push(`${num(set.incline)}%`);
    if (key === 'calories' && set.calories != null) parts.push(`${set.calories} cal`);
  }
  return parts.length > 0 ? parts.join(' · ') : '—';
}

interface Effort {
  weight: number;
  reps: number;
  oneRepMax: number;
}

/** Best weight × reps effort among draft sets, by estimated 1RM. */
function bestDraftEffort(sets: DraftSet[]): Effort | null {
  let best: Effort | null = null;
  for (const set of sets) {
    const weight = Number(set.values.weight);
    const reps = Number(set.values.reps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) continue;
    const oneRepMax = estimateOneRepMax(weight, reps);
    if (!best || oneRepMax > best.oneRepMax) best = { weight, reps, oneRepMax };
  }
  return best;
}

/** Heaviest stored set of a session (ties broken by reps). */
function topStoredSet(sets: SetRow[]): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number } | null = null;
  for (const set of sets) {
    if (set.weight == null || set.reps == null || set.weight <= 0 || set.reps <= 0) continue;
    if (!best || set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps)) {
      best = { weight: set.weight, reps: set.reps };
    }
  }
  return best;
}

interface Suggestion {
  lastLabel: string;
  targetLabel: string;
}

/**
 * Double-progression target: add load once the top of the rep range is reached,
 * otherwise add reps at the same load. Informational only — never applied.
 */
function buildSuggestion(
  history: ExerciseHistoryEntry | undefined,
  unit: WeightUnit,
): Suggestion | null {
  if (!history || history.trackingType !== 'weight_reps') return null;
  if (history.sessionCount < 2 || !history.lastSession) return null;

  const top = topStoredSet(history.lastSession.sets);
  if (!top) return null;

  const increment = unit === 'kg' ? 2.5 : 5;

  if (top.reps >= 12) {
    return {
      lastLabel: `${num(top.weight)} × ${top.reps}`,
      targetLabel: `${num(top.weight + increment)} ${unit} × 8–10 reps`,
    };
  }
  if (top.reps >= 8) {
    return {
      lastLabel: `${num(top.weight)} × ${top.reps}`,
      targetLabel: `${num(top.weight + increment)} ${unit} × 6–8 reps`,
    };
  }
  return {
    lastLabel: `${num(top.weight)} × ${top.reps}`,
    targetLabel: `${num(top.weight)} ${unit} × ${top.reps + 1}–${top.reps + 2} reps`,
  };
}

/**
 * Read-only context under an exercise title: what was done last time, a
 * progressive-overload target, and live personal-record feedback.
 */
export function ExerciseInsights({ exercise, history }: ExerciseInsightsProps) {
  const suggestion = useMemo(
    () => buildSuggestion(history, exercise.weightUnit),
    [history, exercise.weightUnit],
  );

  const prState = useMemo<'new' | 'current' | null>(() => {
    if (exercise.trackingType !== 'weight_reps') return null;
    const pr = history?.pr;
    if (!pr) return null;
    const current = bestDraftEffort(exercise.sets);
    if (!current) return null;
    if (current.oneRepMax > pr.oneRepMax + EPSILON) return 'new';
    if (Math.abs(current.oneRepMax - pr.oneRepMax) <= EPSILON) return 'current';
    return null;
  }, [exercise.trackingType, exercise.sets, history?.pr]);

  const lastSession = history?.lastSession ?? null;
  const trackingType = history?.trackingType ?? exercise.trackingType;

  if (!lastSession && !prState) return null;

  return (
    <div className="mt-3 space-y-2">
      {lastSession ? (
        <div className="rounded-xl bg-iron-100/70 px-3 py-2.5 dark:bg-iron-800/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-iron-500 dark:text-iron-400">
            Previous workout
          </p>
          <ul className="mt-1 space-y-0.5">
            {lastSession.sets.map((set) => (
              <li key={set.id} className="text-sm tabular-nums text-iron-700 dark:text-iron-200">
                {formatHistorySet(set, trackingType, exercise.name)}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-iron-500 dark:text-iron-400">
            Last performed: {formatDateShort(lastSession.date)}
          </p>
        </div>
      ) : null}

      {suggestion ? (
        <div className="rounded-xl border border-dashed border-iron-300 px-3 py-2.5 dark:border-iron-700">
          <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-iron-500 dark:text-iron-400">
            <span>Last workout</span>
            <span className="font-medium tabular-nums text-iron-700 dark:text-iron-200">
              {suggestion.lastLabel}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-xs text-iron-500 dark:text-iron-400">
            <span>Suggested next target</span>
            <span className="font-semibold tabular-nums text-flame-600 dark:text-flame-400">
              {suggestion.targetLabel}
            </span>
          </div>
        </div>
      ) : null}

      {prState === 'new' ? (
        <p
          className="rounded-xl bg-flame-50 px-3 py-2 text-sm font-semibold text-flame-700 dark:bg-flame-950/40 dark:text-flame-300"
          role="status"
        >
          🎉 New Personal Record!
        </p>
      ) : null}

      {prState === 'current' ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          🏆 Current Personal Record
        </p>
      ) : null}
    </div>
  );
}
