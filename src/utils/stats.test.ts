import { describe, it, expect } from 'vitest';
import {
  setVolume,
  workoutVolume,
  estimateOneRepMax,
  computeStreak,
  computeDashboardStats,
} from '@/utils/stats';
import { todayISODate } from '@/utils/datetime';
import type { WorkoutWithExercises, SetRow } from '@/types/workout';

let counter = 0;
const id = () => `id-${(counter += 1)}`;

function set(weight: number | null, reps: number | null): SetRow {
  return {
    id: id(),
    workout_exercise_id: 'we',
    weight,
    reps,
    completed: true,
    position: 0,
    created_at: '2026-01-01T00:00:00Z',
  };
}

function workout(
  date: string,
  exercises: { name: string; sets: SetRow[] }[],
): WorkoutWithExercises {
  return {
    id: id(),
    user_id: 'u',
    date,
    start_time: null,
    end_time: null,
    duration_seconds: 3600,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    exercises: exercises.map((e, i) => ({
      id: id(),
      workout_id: 'w',
      exercise_id: null,
      name: e.name,
      category: 'chest',
      equipment_type: 'machine',
      weight_unit: 'lbs',
      notes: null,
      position: i,
      created_at: '2026-01-01T00:00:00Z',
      sets: e.sets,
    })),
  };
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

describe('setVolume / workoutVolume', () => {
  it('multiplies weight by reps', () => {
    expect(setVolume({ weight: 100, reps: 10 })).toBe(1000);
  });
  it('treats incomplete sets as zero', () => {
    expect(setVolume({ weight: null, reps: 10 })).toBe(0);
    expect(setVolume({ weight: 100, reps: null })).toBe(0);
  });
  it('sums all sets in a workout', () => {
    const w = workout('2026-01-01', [{ name: 'Bench', sets: [set(100, 10), set(100, 5)] }]);
    expect(workoutVolume(w)).toBe(1500);
  });
});

describe('estimateOneRepMax (Epley)', () => {
  it('returns the load for a single rep', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });
  it('applies the Epley formula for multiple reps', () => {
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.33, 1);
  });
  it('returns 0 for invalid input', () => {
    expect(estimateOneRepMax(0, 5)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
  });
});

describe('computeStreak', () => {
  it('counts consecutive days ending today', () => {
    const today = todayISODate();
    const dates = new Set([today, addDays(today, -1), addDays(today, -2)]);
    expect(computeStreak(dates)).toBe(3);
  });
  it('still counts when the latest workout was yesterday', () => {
    const today = todayISODate();
    const dates = new Set([addDays(today, -1), addDays(today, -2)]);
    expect(computeStreak(dates)).toBe(2);
  });
  it('breaks on a gap', () => {
    const today = todayISODate();
    const dates = new Set([today, addDays(today, -2)]);
    expect(computeStreak(dates)).toBe(1);
  });
  it('is zero with no recent workouts', () => {
    const today = todayISODate();
    expect(computeStreak(new Set([addDays(today, -5)]))).toBe(0);
  });
});

describe('computeDashboardStats', () => {
  it('aggregates totals, volume, and PRs', () => {
    const today = todayISODate();
    const stats = computeDashboardStats(
      [
        workout(today, [{ name: 'Bench', sets: [set(100, 10), set(120, 5)] }]),
        workout(addDays(today, -1), [{ name: 'Bench', sets: [set(110, 8)] }]),
      ],
      'lbs',
    );
    expect(stats.totalWorkouts).toBe(2);
    expect(stats.totalVolume).toBe(100 * 10 + 120 * 5 + 110 * 8);
    expect(stats.streak).toBe(2);
    expect(stats.mostUsedExercise?.name).toBe('Bench');
    expect(stats.mostUsedExercise?.sessions).toBe(2);
    expect(stats.personalRecords[0]?.name).toBe('Bench');
    expect(stats.personalRecords.length).toBeGreaterThan(0);
  });

  it('handles an empty history', () => {
    const stats = computeDashboardStats([], 'lbs');
    expect(stats.totalWorkouts).toBe(0);
    expect(stats.streak).toBe(0);
    expect(stats.favoriteExercise).toBeNull();
    expect(stats.personalRecords).toEqual([]);
  });
});
