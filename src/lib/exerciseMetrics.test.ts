import { describe, it, expect } from 'vitest';
import {
  inferTrackingType,
  metricKeysFor,
  durationMultiplier,
  metricFields,
  isStrength,
} from '@/lib/exerciseMetrics';

describe('inferTrackingType', () => {
  it('detects cardio by category or equipment', () => {
    expect(inferTrackingType('cardio', 'cardio', 'Treadmill')).toBe('cardio');
    expect(inferTrackingType('legs', 'cardio', 'Air Bike')).toBe('cardio');
  });
  it('detects plank as a hold', () => {
    expect(inferTrackingType('core', 'bodyweight', 'Plank')).toBe('duration');
  });
  it('treats other bodyweight moves as reps', () => {
    expect(inferTrackingType('core', 'bodyweight', 'Hanging Leg Raise')).toBe('reps');
  });
  it('defaults to weight + reps', () => {
    expect(inferTrackingType('chest', 'machine', 'Chest Press')).toBe('weight_reps');
  });
});

describe('metricKeysFor', () => {
  it('gives treadmill speed and incline', () => {
    expect(metricKeysFor('cardio', 'Treadmill')).toEqual(['duration', 'speed', 'incline']);
  });
  it('gives bike distance and calories', () => {
    expect(metricKeysFor('cardio', 'Bike')).toEqual(['duration', 'distance', 'calories']);
  });
  it('gives stair climber duration and calories', () => {
    expect(metricKeysFor('cardio', 'Stair Climber')).toEqual(['duration', 'calories']);
  });
  it('gives a hold just duration', () => {
    expect(metricKeysFor('duration', 'Plank')).toEqual(['duration']);
  });
  it('gives strength weight and reps', () => {
    expect(metricKeysFor('weight_reps', 'Bench')).toEqual(['weight', 'reps']);
  });
});

describe('durationMultiplier & fields', () => {
  it('uses minutes for cardio and seconds for holds', () => {
    expect(durationMultiplier('cardio')).toBe(60);
    expect(durationMultiplier('duration')).toBe(1);
  });
  it('labels the weight field with the unit', () => {
    const fields = metricFields('weight_reps', 'Bench', 'kg');
    expect(fields[0].label).toBe('Weight (kg)');
  });
  it('flags only weight_reps as strength', () => {
    expect(isStrength('weight_reps')).toBe(true);
    expect(isStrength('cardio')).toBe(false);
  });
});
