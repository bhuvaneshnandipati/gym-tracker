import { useReducer } from 'react';
import type { Category, EquipmentType, WeightUnit } from '@/lib/categories';
import type { ExerciseRow, SetRow, WorkoutWithExercises } from '@/types/workout';
import {
  ALL_METRIC_KEYS,
  durationMultiplier,
  inferTrackingType,
  type MetricKey,
  type TrackingType,
} from '@/lib/exerciseMetrics';
import type { SaveSetInput } from '@/api/workouts';
import { durationSeconds, todayISODate } from '@/utils/datetime';

/** A set in the editor; values are strings (one per metric) for controlled inputs. */
export interface DraftSet {
  key: string;
  values: Record<MetricKey, string>;
}

export interface DraftExercise {
  key: string;
  exerciseId: string | null;
  name: string;
  category: Category;
  equipmentType: EquipmentType;
  trackingType: TrackingType;
  weightUnit: WeightUnit;
  notes: string;
  sets: DraftSet[];
}

export interface WorkoutDraft {
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  exercises: DraftExercise[];
  /**
   * Active session time from the workout stopwatch (pauses excluded). When set,
   * it is saved as the workout's duration instead of end − start.
   */
  activeDurationSeconds: number | null;
}

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function emptyValues(): Record<MetricKey, string> {
  return ALL_METRIC_KEYS.reduce(
    (acc, key) => {
      acc[key] = '';
      return acc;
    },
    {} as Record<MetricKey, string>,
  );
}

function emptySet(): DraftSet {
  return { key: uid(), values: emptyValues() };
}

const numToStr = (n: number | null): string => (n != null ? String(n) : '');

/** Map a saved set row to editor string values for a given tracking type. */
function setRowToValues(set: SetRow, trackingType: TrackingType): Record<MetricKey, string> {
  const mult = durationMultiplier(trackingType);
  return {
    weight: numToStr(set.weight),
    reps: numToStr(set.reps),
    duration: set.duration_seconds != null ? String(set.duration_seconds / mult) : '',
    distance: numToStr(set.distance),
    speed: numToStr(set.speed),
    incline: numToStr(set.incline),
    calories: numToStr(set.calories),
  };
}

/** Convert editor string values to a save-ready set for a tracking type. */
export function serializeSet(
  values: Record<MetricKey, string>,
  trackingType: TrackingType,
): SaveSetInput {
  const num = (s: string): number | null => {
    const t = s.trim();
    if (t === '') return null;
    const v = Number(t);
    return Number.isFinite(v) ? v : null;
  };
  const int = (s: string): number | null => {
    const v = num(s);
    return v != null ? Math.round(v) : null;
  };
  const dur = num(values.duration);
  const mult = durationMultiplier(trackingType);
  return {
    weight: num(values.weight),
    reps: int(values.reps),
    durationSeconds: dur != null ? Math.round(dur * mult) : null,
    distance: num(values.distance),
    speed: num(values.speed),
    incline: num(values.incline),
    calories: int(values.calories),
  };
}

/** True when a serialized set carries no data at all. */
export function isEmptySaveSet(set: SaveSetInput): boolean {
  return (
    set.weight == null &&
    set.reps == null &&
    set.durationSeconds == null &&
    set.distance == null &&
    set.speed == null &&
    set.incline == null &&
    set.calories == null
  );
}

function resolveTrackingType(ex: {
  tracking_type?: TrackingType;
  category: Category;
  equipment_type: EquipmentType;
  name: string;
}): TrackingType {
  return ex.tracking_type ?? inferTrackingType(ex.category, ex.equipment_type, ex.name);
}

export function createEmptyDraft(defaultUnit: WeightUnit = 'lbs'): WorkoutDraft {
  void defaultUnit;
  return {
    date: todayISODate(),
    startTime: '',
    endTime: '',
    notes: '',
    exercises: [],
    activeDurationSeconds: null,
  };
}

function mapSavedExercise(
  ex: WorkoutWithExercises['exercises'][number],
  fallbackUnit?: WeightUnit,
): DraftExercise {
  const trackingType = resolveTrackingType(ex);
  return {
    key: uid(),
    exerciseId: ex.exercise_id,
    name: ex.name,
    category: ex.category,
    equipmentType: ex.equipment_type,
    trackingType,
    weightUnit: ex.weight_unit ?? fallbackUnit ?? 'lbs',
    notes: ex.notes ?? '',
    sets:
      ex.sets.length > 0
        ? ex.sets.map((s) => ({ key: uid(), values: setRowToValues(s, trackingType) }))
        : [emptySet()],
  };
}

/** Build an editor draft from a saved workout (for editing). */
export function draftFromWorkout(workout: WorkoutWithExercises): WorkoutDraft {
  const toTime = (iso: string | null) => (iso ? new Date(iso).toTimeString().slice(0, 5) : '');
  const startTime = toTime(workout.start_time);
  const endTime = toTime(workout.end_time);
  // A stored duration that differs from end − start came from the stopwatch;
  // keep it so re-saving the workout doesn't silently overwrite it.
  const fromTimes = durationSeconds(workout.date, startTime, endTime);
  const activeDurationSeconds =
    workout.duration_seconds != null && workout.duration_seconds !== fromTimes
      ? workout.duration_seconds
      : null;
  return {
    date: workout.date,
    startTime,
    endTime,
    notes: workout.notes ?? '',
    exercises: workout.exercises.map((ex) => mapSavedExercise(ex)),
    activeDurationSeconds,
  };
}

/** Build a fresh draft that copies the exercises/sets of a previous workout. */
export function draftFromTemplate(
  workout: WorkoutWithExercises,
  defaultUnit: WeightUnit,
): WorkoutDraft {
  return {
    date: todayISODate(),
    startTime: '',
    endTime: '',
    notes: '',
    exercises: workout.exercises.map((ex) => mapSavedExercise(ex, defaultUnit)),
    activeDurationSeconds: null,
  };
}

/**
 * Build a draft exercise from the library.
 *
 * When `previousSets` are supplied (the user's most recent session for this
 * exercise) they are recreated set-for-set so the values can be edited rather
 * than retyped. Otherwise a single empty set is created.
 */
export function exerciseToDraft(
  exercise: ExerciseRow,
  unit: WeightUnit,
  previousSets?: SetRow[],
): DraftExercise {
  const trackingType = resolveTrackingType(exercise);
  return {
    key: uid(),
    exerciseId: exercise.id,
    name: exercise.name,
    category: exercise.category,
    equipmentType: exercise.equipment_type,
    trackingType,
    weightUnit: unit,
    notes: '',
    sets:
      previousSets && previousSets.length > 0
        ? previousSets.map((s) => ({ key: uid(), values: setRowToValues(s, trackingType) }))
        : [emptySet()],
  };
}

type Action =
  | { type: 'reset'; draft: WorkoutDraft }
  | { type: 'setWorkoutField'; field: 'date' | 'startTime' | 'endTime' | 'notes'; value: string }
  | {
      type: 'patchSession';
      patch: Partial<Pick<WorkoutDraft, 'startTime' | 'endTime' | 'activeDurationSeconds'>>;
    }
  | { type: 'addExercise'; exercise: DraftExercise }
  | { type: 'removeExercise'; key: string }
  | { type: 'duplicateExercise'; key: string }
  | { type: 'moveExercise'; key: string; direction: -1 | 1 }
  | { type: 'setExerciseField'; key: string; field: 'notes' | 'weightUnit'; value: string }
  | { type: 'addSet'; exerciseKey: string }
  | { type: 'removeSet'; exerciseKey: string; setKey: string }
  | {
      type: 'setSetField';
      exerciseKey: string;
      setKey: string;
      field: MetricKey;
      value: string;
    };

function mapExerciseFn(
  draft: WorkoutDraft,
  key: string,
  fn: (ex: DraftExercise) => DraftExercise,
): WorkoutDraft {
  return { ...draft, exercises: draft.exercises.map((ex) => (ex.key === key ? fn(ex) : ex)) };
}

function reducer(draft: WorkoutDraft, action: Action): WorkoutDraft {
  switch (action.type) {
    case 'reset':
      return action.draft;

    case 'setWorkoutField':
      return { ...draft, [action.field]: action.value };

    case 'patchSession':
      return { ...draft, ...action.patch };

    case 'addExercise':
      return { ...draft, exercises: [...draft.exercises, action.exercise] };

    case 'removeExercise':
      return { ...draft, exercises: draft.exercises.filter((ex) => ex.key !== action.key) };

    case 'duplicateExercise': {
      const index = draft.exercises.findIndex((ex) => ex.key === action.key);
      if (index === -1) return draft;
      const original = draft.exercises[index];
      const copy: DraftExercise = {
        ...original,
        key: uid(),
        sets: original.sets.map((s) => ({ key: uid(), values: { ...s.values } })),
      };
      const next = [...draft.exercises];
      next.splice(index + 1, 0, copy);
      return { ...draft, exercises: next };
    }

    case 'moveExercise': {
      const index = draft.exercises.findIndex((ex) => ex.key === action.key);
      const target = index + action.direction;
      if (index === -1 || target < 0 || target >= draft.exercises.length) return draft;
      const next = [...draft.exercises];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...draft, exercises: next };
    }

    case 'setExerciseField':
      return mapExerciseFn(draft, action.key, (ex) => ({ ...ex, [action.field]: action.value }));

    case 'addSet':
      return mapExerciseFn(draft, action.exerciseKey, (ex) => {
        const prev = ex.sets[ex.sets.length - 1];
        const seed: DraftSet = prev ? { key: uid(), values: { ...prev.values } } : emptySet();
        return { ...ex, sets: [...ex.sets, seed] };
      });

    case 'removeSet':
      return mapExerciseFn(draft, action.exerciseKey, (ex) => ({
        ...ex,
        sets: ex.sets.filter((s) => s.key !== action.setKey),
      }));

    case 'setSetField':
      return mapExerciseFn(draft, action.exerciseKey, (ex) => ({
        ...ex,
        sets: ex.sets.map((s) =>
          s.key === action.setKey
            ? { ...s, values: { ...s.values, [action.field]: action.value } }
            : s,
        ),
      }));

    default:
      return draft;
  }
}

export function useWorkoutDraft(initial: WorkoutDraft) {
  const [draft, dispatch] = useReducer(reducer, initial);
  return { draft, dispatch };
}
