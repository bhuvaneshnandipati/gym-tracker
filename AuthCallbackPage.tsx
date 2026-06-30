import type { Category, EquipmentType, WeightUnit } from '@/lib/categories';

/** How an exercise's sets are measured. */
export type TrackingType = 'weight_reps' | 'reps' | 'duration' | 'cardio';

export const TRACKING_TYPES = ['weight_reps', 'reps', 'duration', 'cardio'] as const;

export const TRACKING_TYPE_LABELS: Record<TrackingType, string> = {
  weight_reps: 'Weight & reps',
  reps: 'Reps only',
  duration: 'Duration (hold)',
  cardio: 'Cardio',
};

/** The measurable fields a set can record. `duration` is shown per-context; it
 * is always stored in the database as seconds (see durationMultiplier). */
export type MetricKey =
  | 'weight'
  | 'reps'
  | 'duration'
  | 'distance'
  | 'speed'
  | 'incline'
  | 'calories';

export const ALL_METRIC_KEYS: MetricKey[] = [
  'weight',
  'reps',
  'duration',
  'distance',
  'speed',
  'incline',
  'calories',
];

export interface MetricField {
  key: MetricKey;
  label: string;
  /** 'int' rounds to whole numbers on save. */
  kind: 'number' | 'int';
  step: string;
  placeholder: string;
}

/** Best-guess tracking type for an exercise from its category/equipment/name. */
export function inferTrackingType(
  category: Category,
  equipmentType: EquipmentType,
  name: string,
): TrackingType {
  const n = name.toLowerCase();
  if (category === 'cardio' || equipmentType === 'cardio') return 'cardio';
  if (n.includes('plank')) return 'duration';
  if (equipmentType === 'bodyweight') return 'reps';
  return 'weight_reps';
}

/** Which metrics a set records, given the tracking type and exercise name. */
export function metricKeysFor(trackingType: TrackingType, name: string): MetricKey[] {
  switch (trackingType) {
    case 'weight_reps':
      return ['weight', 'reps'];
    case 'reps':
      return ['reps'];
    case 'duration':
      return ['duration'];
    case 'cardio': {
      const n = name.toLowerCase();
      if (n.includes('treadmill')) return ['duration', 'speed', 'incline'];
      if (n.includes('stair')) return ['duration', 'calories'];
      // bike, cycle, elliptical, rower, and generic cardio
      return ['duration', 'distance', 'calories'];
    }
    default:
      return ['weight', 'reps'];
  }
}

/** Display multiplier between the duration input and stored seconds. */
export function durationMultiplier(trackingType: TrackingType): number {
  return trackingType === 'cardio' ? 60 : 1; // cardio shown in minutes, holds in seconds
}

function fieldFor(key: MetricKey, trackingType: TrackingType, unit: WeightUnit): MetricField {
  switch (key) {
    case 'weight':
      return { key, label: `Weight (${unit})`, kind: 'number', step: '0.5', placeholder: '0' };
    case 'reps':
      return { key, label: 'Reps', kind: 'int', step: '1', placeholder: '0' };
    case 'duration':
      return trackingType === 'cardio'
        ? { key, label: 'Duration (min)', kind: 'number', step: '0.5', placeholder: '0' }
        : { key, label: 'Duration (sec)', kind: 'int', step: '5', placeholder: '0' };
    case 'distance':
      return { key, label: 'Distance (mi)', kind: 'number', step: '0.1', placeholder: '0' };
    case 'speed':
      return { key, label: 'Speed (mph)', kind: 'number', step: '0.1', placeholder: '0' };
    case 'incline':
      return { key, label: 'Incline (%)', kind: 'number', step: '0.5', placeholder: '0' };
    case 'calories':
      return { key, label: 'Calories', kind: 'int', step: '1', placeholder: '0' };
    default:
      return { key, label: key, kind: 'number', step: '1', placeholder: '0' };
  }
}

/** Full field descriptors to render for an exercise's sets. */
export function metricFields(
  trackingType: TrackingType,
  name: string,
  unit: WeightUnit,
): MetricField[] {
  return metricKeysFor(trackingType, name).map((key) => fieldFor(key, trackingType, unit));
}

/** Whether this exercise contributes to strength volume / PR tracking. */
export function isStrength(trackingType: TrackingType): boolean {
  return trackingType === 'weight_reps';
}
