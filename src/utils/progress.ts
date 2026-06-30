import type { WorkoutWithExercises } from '@/types/workout';
import { estimateOneRepMax, setVolume } from '@/utils/stats';
import { inferTrackingType, type TrackingType } from '@/lib/exerciseMetrics';

function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function toLocalISO(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

/** Compact axis label like "Jun 24". */
export function compactDateLabel(iso: string): string {
  const d = parseLocalDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

export interface LabeledPoint {
  label: string;
  value: number;
}

/** Workouts per ISO week for the last `weeks` weeks (oldest → newest). */
export function frequencyByWeek(workouts: WorkoutWithExercises[], weeks = 12): LabeledPoint[] {
  const counts = new Map<string, number>();
  for (const w of workouts) {
    const key = toLocalISO(mondayOf(parseLocalDate(w.date)));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const current = mondayOf(new Date());
  const points: LabeledPoint[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = new Date(current);
    start.setDate(start.getDate() - i * 7);
    const key = toLocalISO(start);
    points.push({ label: compactDateLabel(key), value: counts.get(key) ?? 0 });
  }
  return points;
}

/** Workouts per month for the last `months` months (oldest → newest). */
export function frequencyByMonth(workouts: WorkoutWithExercises[], months = 12): LabeledPoint[] {
  const counts = new Map<string, number>();
  for (const w of workouts) {
    const d = parseLocalDate(w.date);
    counts.set(
      `${d.getFullYear()}-${d.getMonth()}`,
      (counts.get(`${d.getFullYear()}-${d.getMonth()}`) ?? 0) + 1,
    );
  }
  const now = new Date();
  const points: LabeledPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleDateString(undefined, { month: 'short' });
    points.push({ label, value: counts.get(key) ?? 0 });
  }
  return points;
}

/** Total volume per workout over time (oldest → newest). */
export function volumeOverTime(workouts: WorkoutWithExercises[]): LabeledPoint[] {
  return [...workouts]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({
      label: compactDateLabel(w.date),
      value: Math.round(
        w.exercises.reduce((s, ex) => s + ex.sets.reduce((t, set) => t + setVolume(set), 0), 0),
      ),
    }))
    .filter((p) => p.value > 0);
}

/** Workout duration (minutes) over time (oldest → newest). */
export function durationOverTime(workouts: WorkoutWithExercises[]): LabeledPoint[] {
  return [...workouts]
    .filter((w) => w.duration_seconds != null && w.duration_seconds > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({
      label: compactDateLabel(w.date),
      value: Math.round((w.duration_seconds as number) / 60),
    }));
}

/** Distinct exercise names that appear in history, ordered by sessions desc. */
export function exerciseNames(workouts: WorkoutWithExercises[]): string[] {
  const sessions = new Map<string, number>();
  for (const w of workouts) {
    const seen = new Set<string>();
    for (const ex of w.exercises) {
      if (!seen.has(ex.name)) {
        seen.add(ex.name);
        sessions.set(ex.name, (sessions.get(ex.name) ?? 0) + 1);
      }
    }
  }
  return [...sessions.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([n]) => n);
}

export interface ExerciseSession {
  date: string;
  topWeight: number;
  bestOneRepMax: number;
  volume: number;
  totalReps: number;
  setCount: number;
  avgWeight: number | null;
  avgReps: number | null;
  unit: string;
  durationSeconds: number;
  distance: number;
  calories: number;
}

/** Per-session aggregates for one exercise (oldest → newest). */
export function exerciseSessions(
  workouts: WorkoutWithExercises[],
  name: string,
): ExerciseSession[] {
  const sessions: ExerciseSession[] = [];

  for (const w of [...workouts].sort((a, b) => a.date.localeCompare(b.date))) {
    const entries = w.exercises.filter((ex) => ex.name === name);
    if (entries.length === 0) continue;

    let topWeight = 0;
    let bestOneRepMax = 0;
    let volume = 0;
    let totalReps = 0;
    let setCount = 0;
    let weightSum = 0;
    let weightSamples = 0;
    let repsSum = 0;
    let repsSamples = 0;
    let durationSeconds = 0;
    let distance = 0;
    let calories = 0;
    const unit = entries[0].weight_unit;

    for (const ex of entries) {
      for (const set of ex.sets) {
        setCount += 1;
        volume += setVolume(set);
        if (set.weight != null) {
          topWeight = Math.max(topWeight, set.weight);
          weightSum += set.weight;
          weightSamples += 1;
        }
        if (set.reps != null) {
          totalReps += set.reps;
          repsSum += set.reps;
          repsSamples += 1;
        }
        if (set.weight != null && set.reps != null && set.weight > 0 && set.reps > 0) {
          bestOneRepMax = Math.max(bestOneRepMax, estimateOneRepMax(set.weight, set.reps));
        }
        if (set.duration_seconds != null) durationSeconds += set.duration_seconds;
        if (set.distance != null) distance += set.distance;
        if (set.calories != null) calories += set.calories;
      }
    }

    sessions.push({
      date: w.date,
      topWeight,
      bestOneRepMax,
      volume,
      totalReps,
      setCount,
      avgWeight: weightSamples > 0 ? weightSum / weightSamples : null,
      avgReps: repsSamples > 0 ? repsSum / repsSamples : null,
      unit,
      durationSeconds,
      distance,
      calories,
    });
  }

  return sessions;
}

export interface ExerciseSummary {
  sessions: number;
  unit: string;
  pr: { weight: number; reps: number; oneRepMax: number; date: string } | null;
  bestOneRepMax: number;
  avgWeight: number | null;
  avgReps: number | null;
  totalVolume: number;
}

/** Headline stats for one exercise across all its sessions. */
export function exerciseSummary(workouts: WorkoutWithExercises[], name: string): ExerciseSummary {
  const sessions = exerciseSessions(workouts, name);
  const unit = sessions[0]?.unit ?? 'lbs';

  let bestOneRepMax = 0;
  let pr: ExerciseSummary['pr'] = null;
  let weightSum = 0;
  let weightSamples = 0;
  let repsSum = 0;
  let repsSamples = 0;
  let totalVolume = 0;

  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (ex.name !== name) continue;
      for (const set of ex.sets) {
        totalVolume += setVolume(set);
        if (set.weight != null) {
          weightSum += set.weight;
          weightSamples += 1;
        }
        if (set.reps != null) {
          repsSum += set.reps;
          repsSamples += 1;
        }
        if (set.weight != null && set.reps != null && set.weight > 0 && set.reps > 0) {
          const e1rm = estimateOneRepMax(set.weight, set.reps);
          if (e1rm > bestOneRepMax) {
            bestOneRepMax = e1rm;
            pr = { weight: set.weight, reps: set.reps, oneRepMax: e1rm, date: w.date };
          }
        }
      }
    }
  }

  return {
    sessions: sessions.length,
    unit,
    pr,
    bestOneRepMax,
    avgWeight: weightSamples > 0 ? weightSum / weightSamples : null,
    avgReps: repsSamples > 0 ? repsSum / repsSamples : null,
    totalVolume,
  };
}

/** Running best estimated 1RM over time for one exercise (PR timeline). */
export function prTimeline(sessions: ExerciseSession[]): LabeledPoint[] {
  let best = 0;
  return sessions
    .filter((s) => s.bestOneRepMax > 0)
    .map((s) => {
      best = Math.max(best, s.bestOneRepMax);
      return { label: compactDateLabel(s.date), value: Math.round(best) };
    });
}

/** The tracking type for a named exercise, from its most recent appearance. */
export function trackingTypeFor(workouts: WorkoutWithExercises[], name: string): TrackingType {
  for (const w of workouts) {
    const ex = w.exercises.find((e) => e.name === name);
    if (ex) return ex.tracking_type ?? inferTrackingType(ex.category, ex.equipment_type, ex.name);
  }
  return 'weight_reps';
}
