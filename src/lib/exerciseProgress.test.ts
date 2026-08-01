import { describe, expect, it } from 'vitest';
import {
  bestDraftEffort,
  buildSuggestion,
  compareWeights,
  draftExerciseVolume,
  draftSetVolume,
  formatStoredSet,
  topStoredSet,
} from '@/lib/exerciseProgress';
import type { SetRow } from '@/types/workout';

function storedSet(weight: number | null, reps: number | null, position = 0): SetRow {
  return {
    id: `set-${position}`,
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

const draftSet = (weight: string, reps: string) => ({ values: { weight, reps } });

describe('draftSetVolume', () => {
  it('multiplies weight by reps', () => {
    expect(draftSetVolume({ weight: '220', reps: '12' })).toBe(2640);
  });

  it('returns 0 when either field is blank or non-positive', () => {
    expect(draftSetVolume({ weight: '220', reps: '' })).toBe(0);
    expect(draftSetVolume({ weight: '', reps: '12' })).toBe(0);
    expect(draftSetVolume({ weight: '0', reps: '12' })).toBe(0);
    expect(draftSetVolume({ weight: 'abc', reps: '12' })).toBe(0);
  });
});

describe('draftExerciseVolume', () => {
  it('sums every complete set and ignores the rest', () => {
    const sets = [draftSet('220', '12'), draftSet('240', '10'), draftSet('', '8')];
    expect(draftExerciseVolume(sets)).toBe(2640 + 2400);
  });
});

describe('compareWeights', () => {
  it('classifies progress, maintaining and deload', () => {
    expect(compareWeights(225, 220)).toBe('progress');
    expect(compareWeights(220, 220)).toBe('maintaining');
    expect(compareWeights(215, 220)).toBe('deload');
  });

  it('returns null when either side is unknown', () => {
    expect(compareWeights(null, 220)).toBeNull();
    expect(compareWeights(220, null)).toBeNull();
  });
});

describe('topStoredSet / bestDraftEffort', () => {
  it('picks the heaviest stored set, breaking ties on reps', () => {
    const top = topStoredSet([storedSet(220, 12, 0), storedSet(240, 8, 1), storedSet(240, 10, 2)]);
    expect(top).toEqual({ weight: 240, reps: 10 });
  });

  it('ignores stored sets without both weight and reps', () => {
    expect(topStoredSet([storedSet(null, 10), storedSet(200, null)])).toBeNull();
  });

  it('picks the best draft effort by estimated 1RM', () => {
    const best = bestDraftEffort([draftSet('220', '12'), draftSet('250', '5')]);
    expect(best?.weight).toBe(220); // 220 × 1.4 = 308 beats 250 × 1.167 ≈ 292
  });
});

describe('buildSuggestion', () => {
  const base = { trackingType: 'weight_reps' as const, sessionCount: 2 };

  it('adds load and drops the rep range from a set of 8', () => {
    const suggestion = buildSuggestion({ ...base, lastSessionSets: [storedSet(240, 8)] }, 'lbs');
    expect(suggestion).toEqual({ lastLabel: '240 × 8', targetLabel: '245 lbs × 6–8 reps' });
  });

  it('adds load from the top of the rep range', () => {
    const suggestion = buildSuggestion({ ...base, lastSessionSets: [storedSet(220, 12)] }, 'lbs');
    expect(suggestion?.targetLabel).toBe('225 lbs × 8–10 reps');
  });

  it('adds reps at the same load below 8 reps, and uses 2.5 kg increments', () => {
    expect(
      buildSuggestion({ ...base, lastSessionSets: [storedSet(100, 5)] }, 'kg')?.targetLabel,
    ).toBe('100 kg × 6–7 reps');
    expect(
      buildSuggestion({ ...base, lastSessionSets: [storedSet(100, 10)] }, 'kg')?.targetLabel,
    ).toBe('102.5 kg × 6–8 reps');
  });

  it('needs at least two prior sessions of a weight × reps exercise', () => {
    expect(
      buildSuggestion({ ...base, sessionCount: 1, lastSessionSets: [storedSet(240, 8)] }, 'lbs'),
    ).toBeNull();
    expect(
      buildSuggestion(
        { trackingType: 'cardio', sessionCount: 5, lastSessionSets: [storedSet(240, 8)] },
        'lbs',
      ),
    ).toBeNull();
    expect(buildSuggestion(null, 'lbs')).toBeNull();
  });
});

describe('formatStoredSet', () => {
  it('formats weight × reps', () => {
    expect(formatStoredSet(storedSet(220, 12), 'weight_reps', 'Leg Press')).toBe('220 × 12');
  });

  it('falls back to an em dash when nothing was recorded', () => {
    expect(formatStoredSet(storedSet(null, null), 'weight_reps', 'Leg Press')).toBe('—');
  });

  it('formats cardio in minutes with its machine-specific fields', () => {
    const set: SetRow = {
      ...storedSet(null, null),
      duration_seconds: 1800,
      speed: 3.5,
      incline: 6,
    };
    expect(formatStoredSet(set, 'cardio', 'Treadmill')).toBe('30 min · 3.5 mph · 6%');
  });
});
