import type { SetRow, WorkoutWithExercises } from '@/types/workout';
import { todayISODate } from '@/utils/datetime';

/** Volume contributed by a single set (weight × reps), 0 when incomplete. */
export function setVolume(set: Pick<SetRow, 'weight' | 'reps'>): number {
  if (set.weight == null || set.reps == null) return 0;
  return set.weight * set.reps;
}

/** Total volume across every set in a workout. */
export function workoutVolume(workout: WorkoutWithExercises): number {
  return workout.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + setVolume(set), 0),
    0,
  );
}

/** Total number of sets logged in a workout. */
export function workoutSetCount(workout: WorkoutWithExercises): number {
  return workout.exercises.reduce((n, ex) => n + ex.sets.length, 0);
}

/** Estimated one-rep max (Epley formula). Returns the load when reps ≤ 1. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function toLocalISO(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

/** Monday-based start of the ISO week containing `date`. */
function startOfWeek(date: Date): Date {
  const d = parseLocalDate(toLocalISO(date));
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return d;
}

/** Consecutive-day streak ending today (or yesterday if nothing logged today). */
export function computeStreak(dates: Set<string>): number {
  const cursor = parseLocalDate(todayISODate());
  if (!dates.has(toLocalISO(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!dates.has(toLocalISO(cursor))) return 0;
  }
  let streak = 0;
  while (dates.has(toLocalISO(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface PersonalRecord {
  name: string;
  weight: number;
  reps: number;
  unit: string;
  oneRepMax: number;
  date: string;
}

export interface DashboardStats {
  totalWorkouts: number;
  thisWeek: number;
  thisMonth: number;
  streak: number;
  avgDurationSeconds: number | null;
  totalVolume: number;
  favoriteExercise: { name: string; sets: number } | null;
  mostUsedExercise: { name: string; sessions: number } | null;
  personalRecords: PersonalRecord[];
  recent: WorkoutWithExercises[];
}

/**
 * Derive every dashboard metric from the full workout list. Computed client-side
 * (personal scale), so the dashboard and history share one cached query.
 */
export function computeDashboardStats(
  workouts: WorkoutWithExercises[],
  defaultUnit: string,
): DashboardStats {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;

  const dates = new Set<string>();
  let thisWeek = 0;
  let thisMonth = 0;
  let totalVolume = 0;
  let durationSum = 0;
  let durationCount = 0;

  const setsByExercise = new Map<string, number>();
  const sessionsByExercise = new Map<string, number>();
  const prByExercise = new Map<string, PersonalRecord>();

  for (const workout of workouts) {
    dates.add(workout.date);

    const d = parseLocalDate(workout.date);
    if (d >= weekStart) thisWeek += 1;
    if (`${d.getFullYear()}-${d.getMonth()}` === monthKey) thisMonth += 1;

    if (workout.duration_seconds != null) {
      durationSum += workout.duration_seconds;
      durationCount += 1;
    }

    const seenThisSession = new Set<string>();
    for (const ex of workout.exercises) {
      setsByExercise.set(ex.name, (setsByExercise.get(ex.name) ?? 0) + ex.sets.length);

      if (!seenThisSession.has(ex.name)) {
        seenThisSession.add(ex.name);
        sessionsByExercise.set(ex.name, (sessionsByExercise.get(ex.name) ?? 0) + 1);
      }

      for (const set of ex.sets) {
        totalVolume += setVolume(set);
        if (set.weight != null && set.reps != null && set.weight > 0 && set.reps > 0) {
          const e1rm = estimateOneRepMax(set.weight, set.reps);
          const current = prByExercise.get(ex.name);
          if (!current || e1rm > current.oneRepMax) {
            prByExercise.set(ex.name, {
              name: ex.name,
              weight: set.weight,
              reps: set.reps,
              unit: ex.weight_unit,
              oneRepMax: e1rm,
              date: workout.date,
            });
          }
        }
      }
    }
  }

  const favoriteExercise = [...setsByExercise.entries()]
    .map(([name, sets]) => ({ name, sets }))
    .sort((a, b) => b.sets - a.sets)[0];

  const mostUsedExercise = [...sessionsByExercise.entries()]
    .map(([name, sessions]) => ({ name, sessions }))
    .sort((a, b) => b.sessions - a.sessions)[0];

  const personalRecords = [...prByExercise.values()]
    .sort((a, b) => b.oneRepMax - a.oneRepMax)
    .slice(0, 5);

  void defaultUnit;

  return {
    totalWorkouts: workouts.length,
    thisWeek,
    thisMonth,
    streak: computeStreak(dates),
    avgDurationSeconds: durationCount > 0 ? Math.round(durationSum / durationCount) : null,
    totalVolume,
    favoriteExercise: favoriteExercise ?? null,
    mostUsedExercise: mostUsedExercise ?? null,
    personalRecords,
    recent: workouts.slice(0, 5),
  };
}
