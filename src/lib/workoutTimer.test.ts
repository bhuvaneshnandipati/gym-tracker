import { describe, expect, it } from 'vitest';
import {
  createInitialTimerState,
  pauseStopwatch,
  startStopwatch,
  type StopwatchState,
} from '@/lib/timerEngine';
import { epochToHHMM, sessionPatchFromStopwatch, stopwatchBelongsTo } from '@/lib/workoutTimer';
import { buildPayload } from '@/lib/workoutPayload';
import { createEmptyDraft, draftFromWorkout, type WorkoutDraft } from '@/hooks/useWorkoutDraft';
import { clearTimerLog, formatTimerLog, getTimerLog, timerLog } from '@/lib/timerLogger';
import type { WorkoutWithExercises } from '@/types/workout';

const local = (h: number, m: number) => new Date(2026, 5, 24, h, m, 0, 0).getTime();
const idle = (): StopwatchState => createInitialTimerState().stopwatch;

describe('stopwatchBelongsTo', () => {
  const running = startStopwatch(idle(), local(9, 0));

  it('never applies an idle stopwatch', () => {
    expect(stopwatchBelongsTo(idle(), undefined, true)).toBe(false);
  });

  it('applies to a new workout when not linked elsewhere', () => {
    expect(stopwatchBelongsTo(running, undefined, true)).toBe(true);
    expect(stopwatchBelongsTo({ ...running, linkedWorkoutId: 'w1' }, 'w1', true)).toBe(true);
    expect(stopwatchBelongsTo({ ...running, linkedWorkoutId: 'other' }, undefined, true)).toBe(
      false,
    );
  });

  it('applies when re-opening the linked workout, but not other old workouts', () => {
    expect(stopwatchBelongsTo({ ...running, linkedWorkoutId: 'w1' }, 'w1', false)).toBe(true);
    expect(stopwatchBelongsTo(running, 'w2', false)).toBe(false);
  });
});

describe('sessionPatchFromStopwatch', () => {
  it('uses active time and fills empty start/end times', () => {
    let sw = startStopwatch(idle(), local(9, 0));
    sw = pauseStopwatch(sw, local(9, 30)); // 30 min active
    sw = startStopwatch(sw, local(9, 40)); // 10 min paused
    const patch = sessionPatchFromStopwatch(sw, { startTime: '', endTime: '' }, local(10, 0));
    expect(patch).toEqual({ activeDurationSeconds: 50 * 60, startTime: '09:00', endTime: '10:00' });
  });

  it('keeps times the user typed in', () => {
    const sw = startStopwatch(idle(), local(9, 0));
    const patch = sessionPatchFromStopwatch(
      sw,
      { startTime: '08:55', endTime: '10:05' },
      local(10, 0),
    );
    expect(patch).toEqual({ activeDurationSeconds: 60 * 60 });
  });

  it('formats epoch times as local HH:MM', () => {
    expect(epochToHHMM(local(7, 5))).toBe('07:05');
  });
});

describe('workout duration from the stopwatch', () => {
  const draftWithSet = (patch: Partial<WorkoutDraft>): WorkoutDraft => ({
    ...createEmptyDraft(),
    date: '2026-06-24',
    startTime: '09:00',
    endTime: '10:00',
    exercises: [
      {
        key: 'e1',
        exerciseId: null,
        name: 'Bench Press',
        category: 'chest',
        equipmentType: 'free_weight',
        trackingType: 'weight_reps',
        weightUnit: 'kg',
        notes: '',
        sets: [
          {
            key: 's1',
            values: {
              weight: '60',
              reps: '8',
              duration: '',
              distance: '',
              speed: '',
              incline: '',
              calories: '',
            },
          },
        ],
      },
    ],
    ...patch,
  });

  it('saves end − start when no stopwatch time is set (existing behaviour)', () => {
    const result = buildPayload(draftWithSet({}));
    expect('payload' in result && result.payload.durationSeconds).toBe(3600);
  });

  it('saves the stopwatch active time when present', () => {
    const result = buildPayload(draftWithSet({ activeDurationSeconds: 2700 }));
    expect('payload' in result && result.payload.durationSeconds).toBe(2700);
  });

  it('keeps a stored stopwatch duration when a workout is re-opened for editing', () => {
    const base: WorkoutWithExercises = {
      id: 'w1',
      user_id: 'u1',
      date: '2026-06-24',
      start_time: new Date(local(9, 0)).toISOString(),
      end_time: new Date(local(10, 0)).toISOString(),
      duration_seconds: 2700,
      notes: null,
      created_at: '',
      updated_at: '',
      exercises: [],
    };
    expect(draftFromWorkout(base).activeDurationSeconds).toBe(2700);
    // A duration matching end − start is just the computed value: nothing kept.
    expect(draftFromWorkout({ ...base, duration_seconds: 3600 }).activeDurationSeconds).toBeNull();
  });
});

describe('timerLogger', () => {
  it('buffers entries and formats them as text', () => {
    clearTimerLog();
    timerLog.info('rest/start', { durationSec: 90 });
    timerLog.debug('clock.visible');
    const entries = getTimerLog();
    expect(entries.map((e) => e.event)).toEqual(['rest/start', 'clock.visible']);
    expect(formatTimerLog()).toMatch(/INFO {2}rest\/start \{"durationSec":90\}/);
  });

  it('caps the buffer at 200 entries', () => {
    clearTimerLog();
    for (let i = 0; i < 250; i += 1) timerLog.debug(`e${i}`);
    const entries = getTimerLog();
    expect(entries).toHaveLength(200);
    expect(entries[0].event).toBe('e50');
  });
});
