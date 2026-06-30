import { describe, it, expect } from 'vitest';
import {
  exerciseNames,
  exerciseSessions,
  exerciseSummary,
  prTimeline,
  frequencyByMonth,
} from '@/utils/progress';
import type { WorkoutWithExercises, SetRow } from '@/types/workout';

let n = 0;
const id = () => `p-${(n += 1)}`;

function set(weight: number, reps: number): SetRow {
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

function workout(date: string, name: string, sets: SetRow[]): WorkoutWithExercises {
  return {
    id: id(),
    user_id: 'u',
    date,
    start_time: null,
    end_time: null,
    duration_seconds: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    exercises: [
      {
        id: id(),
        workout_id: 'w',
        exercise_id: null,
        name,
        category: 'legs',
        equipment_type: 'machine',
        weight_unit: 'lbs',
        notes: null,
        position: 0,
        created_at: '2026-01-01T00:00:00Z',
        sets,
      },
    ],
  };
}

const history: WorkoutWithExercises[] = [
  workout('2026-05-01', 'Squat', [set(200, 5), set(200, 5)]),
  workout('2026-05-08', 'Squat', [set(210, 5)]),
  workout('2026-05-15', 'Squat', [set(225, 3)]),
];

describe('exerciseNames', () => {
  it('lists distinct exercises', () => {
    expect(exerciseNames(history)).toEqual(['Squat']);
  });
});

describe('exerciseSessions', () => {
  it('aggregates per session, oldest first', () => {
    const sessions = exerciseSessions(history, 'Squat');
    expect(sessions).toHaveLength(3);
    expect(sessions[0].date).toBe('2026-05-01');
    expect(sessions[0].topWeight).toBe(200);
    expect(sessions[0].volume).toBe(2000);
    expect(sessions[2].topWeight).toBe(225);
  });
});

describe('exerciseSummary', () => {
  it('computes the PR by estimated 1RM', () => {
    const summary = exerciseSummary(history, 'Squat');
    expect(summary.sessions).toBe(3);
    expect(summary.pr?.weight).toBe(225);
    expect(summary.pr?.reps).toBe(3);
    expect(summary.bestOneRepMax).toBeGreaterThan(225);
  });
});

describe('prTimeline', () => {
  it('is monotonically non-decreasing', () => {
    const series = prTimeline(exerciseSessions(history, 'Squat'));
    for (let i = 1; i < series.length; i += 1) {
      expect(series[i].value).toBeGreaterThanOrEqual(series[i - 1].value);
    }
  });
});

describe('frequencyByMonth', () => {
  it('returns the requested number of buckets', () => {
    expect(frequencyByMonth(history, 6)).toHaveLength(6);
  });
});
