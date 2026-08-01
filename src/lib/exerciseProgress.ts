/**
 * Pure helpers shared by the exercise card: set volume, comparison against the
 * previous session, and the progressive-overload suggestion.
 *
 * Kept free of React so the rules stay unit-testable and so the editor, the
 * header chips and the insight strip all read from one implementation.
 */

import type { WeightUnit } from '@/lib/categories';
import { metricKeysFor, type MetricKey, type TrackingType } from '@/lib/exerciseMetrics';
import { estimateOneRepMax } from '@/utils/stats';
import type { SetRow } from '@/types/workout';
import { formatClock } from '@/utils/datetime';

/** Trim trailing zeros so 220.0 reads as "220". */
export function num(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** Parse a controlled-input string into a finite positive number, else null. */
export function parsePositive(value: string | undefined): number | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Volume (weight × reps) for one editor set; 0 unless both values are present. */
export function draftSetVolume(values: Partial<Record<MetricKey, string>>): number {
  const weight = parsePositive(values.weight);
  const reps = parsePositive(values.reps);
  if (weight == null || reps == null) return 0;
  return weight * reps;
}

/** Total volume across every set of an editor exercise. */
export function draftExerciseVolume(
  sets: { values: Partial<Record<MetricKey, string>> }[],
): number {
  return sets.reduce((total, set) => total + draftSetVolume(set.values), 0);
}

/** One compact human-readable line for a stored set, honouring the tracking type. */
export function formatStoredSet(set: SetRow, trackingType: TrackingType, name: string): string {
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

export interface Effort {
  weight: number;
  reps: number;
  oneRepMax: number;
}

/** Best weight × reps effort among editor sets, by estimated 1RM. */
export function bestDraftEffort(
  sets: { values: Partial<Record<MetricKey, string>> }[],
): Effort | null {
  let best: Effort | null = null;
  for (const set of sets) {
    const weight = parsePositive(set.values.weight);
    const reps = parsePositive(set.values.reps);
    if (weight == null || reps == null) continue;
    const oneRepMax = estimateOneRepMax(weight, reps);
    if (!best || oneRepMax > best.oneRepMax) best = { weight, reps, oneRepMax };
  }
  return best;
}

/** Heaviest stored set of a session (ties broken by reps). */
export function topStoredSet(sets: SetRow[]): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number } | null = null;
  for (const set of sets) {
    if (set.weight == null || set.reps == null || set.weight <= 0 || set.reps <= 0) continue;
    if (!best || set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps)) {
      best = { weight: set.weight, reps: set.reps };
    }
  }
  return best;
}

// ---------------------------------------------------------------- comparison

export type ProgressTrend = 'progress' | 'maintaining' | 'deload';

export interface TrendMeta {
  label: string;
  icon: string;
  /** Badge classes (light + dark). */
  badge: string;
}

export const TREND_META: Record<ProgressTrend, TrendMeta> = {
  progress: {
    label: 'Progress',
    icon: '📈',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  maintaining: {
    label: 'Maintaining',
    icon: '➡',
    badge: 'bg-iron-200 text-iron-700 dark:bg-iron-800 dark:text-iron-300',
  },
  deload: {
    label: 'Deload',
    icon: '⬇',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  },
};

const EPSILON = 0.001;

/**
 * Compare today's load against the matching set from the previous session.
 * Returns null when either side is missing, so nothing is shown for a set the
 * user has not filled in yet.
 */
export function compareWeights(
  current: number | null,
  previous: number | null,
): ProgressTrend | null {
  if (current == null || previous == null) return null;
  if (current > previous + EPSILON) return 'progress';
  if (current < previous - EPSILON) return 'deload';
  return 'maintaining';
}

// ---------------------------------------------------------------- suggestion

export interface OverloadSuggestion {
  lastLabel: string;
  targetLabel: string;
}

export interface SuggestionInput {
  trackingType: TrackingType;
  sessionCount: number;
  lastSessionSets: SetRow[] | null;
}

/**
 * Double-progression target: add load once the top of the rep range is reached,
 * otherwise add reps at the same load. Informational only — never written into
 * an input. Requires at least two prior sessions of a weight × reps exercise.
 */
export function buildSuggestion(
  input: SuggestionInput | null | undefined,
  unit: WeightUnit,
): OverloadSuggestion | null {
  if (!input || input.trackingType !== 'weight_reps') return null;
  if (input.sessionCount < 2 || !input.lastSessionSets) return null;

  const top = topStoredSet(input.lastSessionSets);
  if (!top) return null;

  const increment = unit === 'kg' ? 2.5 : 5;
  const lastLabel = `${num(top.weight)} × ${top.reps}`;

  if (top.reps >= 12) {
    return { lastLabel, targetLabel: `${num(top.weight + increment)} ${unit} × 8–10 reps` };
  }
  if (top.reps >= 8) {
    return { lastLabel, targetLabel: `${num(top.weight + increment)} ${unit} × 6–8 reps` };
  }
  return {
    lastLabel,
    targetLabel: `${num(top.weight)} ${unit} × ${top.reps + 1}–${top.reps + 2} reps`,
  };
}
