import { describe, expect, it } from 'vitest';
import { buildExerciseHistory } from '@/hooks/useExerciseHistory';
import type { SetRow, WorkoutWithExercises } from '@/types/workout';

function set(position: number, weight: number, reps: number): SetRow {
  return {
    id: `set-${position}-${weight}-${reps}`,
    workout_exercise_id: 'we',
    weight,
    reps,
    duration_seconds: null,
    distance: null,
    speed: null,
    incline: null,
    calories: null,
    completed: true,
    position,
    created_at: '2026-01-01T00:00:00Z',
  };
}

function workout(id: string, date: string, name: string, sets: SetRow[]): WorkoutWithExercises {
  return {
    id,
    user_id: 'user',
    date,
    start_time: null,
    end_time: null,
    duration_seconds: null,
    notes: null,
    created_at: `${date}T10:00:00Z`,
    updated_at: `${date}T10:00:00Z`,
    exercises: [
      {
        id: `we-${id}`,
        workout_id: id,
        exercise_id: 'ex-1',
        name,
        category: 'legs',
        equipment_type: 'machine',
        weight_unit: 'lbs',
        tracking_type: 'weight_reps',
        notes: null,
        position: 0,
        created_at: `${date}T10:00:00Z`,
        sets,
      },
    ],
  };
}

describe('buildExerciseHistory', () => {
  const older = workout('w1', '2026-01-05', 'Leg Press', [set(0, 300, 5)]);
  const recent = workout('w2', '2026-01-12', 'Leg Press', [
    set(0, 220, 12),
    set(1, 240, 10),
    set(2, 240, 8),
  ]);

  it('uses the most recent session, not the personal-record session', () => {
    const entry = buildExerciseHistory([recent, older]).get('Leg Press');
    expect(entry?.lastSession?.date).toBe('2026-01-12');
    expect(entry?.lastSession?.sets.map((s) => [s.weight, s.reps])).toEqual([
      [220, 12],
      [240, 10],
      [240, 8],
    ]);
  });

  it('tracks the personal record by estimated 1RM across all sessions', () => {
    const entry = buildExerciseHistory([recent, older]).get('Leg Press');
    expect(entry?.pr?.weight).toBe(300);
    expect(entry?.pr?.reps).toBe(5);
    expect(entry?.pr?.date).toBe('2026-01-05');
  });

  it('counts sessions and excludes the workout being edited', () => {
    expect(buildExerciseHistory([recent, older]).get('Leg Press')?.sessionCount).toBe(2);

    const entry = buildExerciseHistory([recent, older], 'w2').get('Leg Press');
    expect(entry?.sessionCount).toBe(1);
    expect(entry?.lastSession?.date).toBe('2026-01-05');
  });

  it('returns no entry for an exercise that has never been performed', () => {
    expect(buildExerciseHistory([recent, older]).get('Hack Squat')).toBeUndefined();
  });
});
