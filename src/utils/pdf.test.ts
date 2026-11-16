import { describe, it, expect, vi } from 'vitest';
import { exportWorkoutsPDF } from './pdf';

// Capture the finished document instead of downloading it (jsPDF sets save() per instance).
const saved: { name: string; pages: number; bytes: number }[] = [];
vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jspdf')>();
  class CapturingPDF extends actual.jsPDF {
    constructor(...args: ConstructorParameters<typeof actual.jsPDF>) {
      super(...args);
      this.save = ((name: string) => {
        saved.push({ name, pages: this.getNumberOfPages(), bytes: this.output('arraybuffer').byteLength });
        return this;
      }) as unknown as typeof this.save;
    }
  }
  return { ...actual, jsPDF: CapturingPDF, default: CapturingPDF };
});
import type { WorkoutWithExercises } from '@/types/workout';

const set = (i: number, weight: number, reps: number) => ({
  id: `s${i}`, workout_exercise_id: 'we1', weight, reps, duration_seconds: null, distance: null,
  speed: null, incline: null, calories: null, completed: true, position: i, created_at: '2026-01-01T00:00:00Z',
});

function workout(day: number): WorkoutWithExercises {
  return {
    id: `w${day}`, user_id: 'u1', date: `2026-01-${String(day).padStart(2, '0')}`, start_time: null,
    end_time: null, duration_seconds: 3600, notes: null, created_at: '', updated_at: '',
    exercises: [{
      id: 'we1', workout_id: `w${day}`, exercise_id: null, name: 'Bench Press', tracking_type: 'weight_reps',
      weight_unit: 'lb', position: 0, sets: [set(0, 135, 10), set(1, 155, 8), set(2, 175, 5)],
    } as unknown as WorkoutWithExercises['exercises'][number]],
  };
}

describe('exportWorkoutsPDF (jsPDF + autotable)', () => {
  it('builds a multi-page PDF with the workout tables', async () => {
    await exportWorkoutsPDF(Array.from({ length: 25 }, (_, i) => workout(i + 1)), 'lb');
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('gym-tracker-workouts.pdf');
    expect(saved[0].pages).toBeGreaterThan(1);
    expect(saved[0].bytes).toBeGreaterThan(1000);
  });
});
