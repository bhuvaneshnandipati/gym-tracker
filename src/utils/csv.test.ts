import { describe, it, expect } from 'vitest';
import { workoutsToCSV, parseWorkoutsCSV } from '@/utils/csv';
import type { WorkoutWithExercises } from '@/types/workout';

const sample: WorkoutWithExercises = {
  id: 'w1',
  user_id: 'u',
  date: '2026-06-01',
  start_time: null,
  end_time: null,
  duration_seconds: 3600,
  notes: 'Felt strong',
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
  exercises: [
    {
      id: 'we1',
      workout_id: 'w1',
      exercise_id: null,
      name: 'Leg Press',
      category: 'legs',
      equipment_type: 'machine',
      weight_unit: 'lbs',
      notes: 'Seat 4',
      position: 0,
      created_at: '2026-06-01T00:00:00Z',
      sets: [
        {
          id: 's1',
          workout_exercise_id: 'we1',
          weight: 220,
          reps: 12,
          completed: true,
          position: 0,
          created_at: '2026-06-01T00:00:00Z',
        },
        {
          id: 's2',
          workout_exercise_id: 'we1',
          weight: 240,
          reps: 10,
          completed: true,
          position: 1,
          created_at: '2026-06-01T00:00:00Z',
        },
      ],
    },
  ],
};

describe('workoutsToCSV', () => {
  it('emits a header and one row per set', () => {
    const csv = workoutsToCSV([sample]);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toContain('date');
    expect(lines[0]).toContain('set_number');
    expect(lines).toHaveLength(3); // header + 2 sets
  });
});

describe('parseWorkoutsCSV round-trip', () => {
  it('reconstructs workouts from exported CSV', () => {
    const csv = workoutsToCSV([sample]);
    const { workouts, errors } = parseWorkoutsCSV(csv);

    expect(errors).toHaveLength(0);
    expect(workouts).toHaveLength(1);

    const w = workouts[0];
    expect(w.date).toBe('2026-06-01');
    expect(w.notes).toBe('Felt strong');
    expect(w.exercises).toHaveLength(1);

    const ex = w.exercises[0];
    expect(ex.name).toBe('Leg Press');
    expect(ex.category).toBe('legs');
    expect(ex.equipmentType).toBe('machine');
    expect(ex.weightUnit).toBe('lbs');
    expect(ex.sets).toEqual([
      { weight: 220, reps: 12 },
      { weight: 240, reps: 10 },
    ]);
  });

  it('coerces unknown category/equipment to "other"', () => {
    const csv = [
      'date,exercise,category,equipment,weight_unit,weight,reps',
      '2026-06-02,Mystery Move,banana,spaceship,lbs,50,5',
    ].join('\n');
    const { workouts } = parseWorkoutsCSV(csv);
    expect(workouts[0].exercises[0].category).toBe('other');
    expect(workouts[0].exercises[0].equipmentType).toBe('other');
  });

  it('ignores rows without a date or exercise', () => {
    const csv = ['date,exercise,weight,reps', ',Bench,100,5', '2026-06-03,,100,5'].join('\n');
    const { workouts } = parseWorkoutsCSV(csv);
    expect(workouts).toHaveLength(0);
  });
});
