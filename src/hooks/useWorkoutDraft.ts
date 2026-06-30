import { useReducer } from 'react';
import type { Category, EquipmentType, WeightUnit } from '@/lib/categories';
import type { ExerciseRow, WorkoutWithExercises } from '@/types/workout';
import { todayISODate } from '@/utils/datetime';

/** A set in the editor; values are strings for controlled inputs. */
export interface DraftSet {
  key: string;
  weight: string;
  reps: string;
}

export interface DraftExercise {
  key: string;
  exerciseId: string | null;
  name: string;
  category: Category;
  equipmentType: EquipmentType;
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
}

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function emptySet(): DraftSet {
  return { key: uid(), weight: '', reps: '' };
}

export function createEmptyDraft(defaultUnit: WeightUnit = 'lbs'): WorkoutDraft {
  void defaultUnit;
  return { date: todayISODate(), startTime: '', endTime: '', notes: '', exercises: [] };
}

/** Build an editor draft from a saved workout (for editing). */
export function draftFromWorkout(workout: WorkoutWithExercises): WorkoutDraft {
  const toTime = (iso: string | null) => (iso ? new Date(iso).toTimeString().slice(0, 5) : '');
  return {
    date: workout.date,
    startTime: toTime(workout.start_time),
    endTime: toTime(workout.end_time),
    notes: workout.notes ?? '',
    exercises: workout.exercises.map((ex) => ({
      key: uid(),
      exerciseId: ex.exercise_id,
      name: ex.name,
      category: ex.category,
      equipmentType: ex.equipment_type,
      weightUnit: ex.weight_unit,
      notes: ex.notes ?? '',
      sets:
        ex.sets.length > 0
          ? ex.sets.map((s) => ({
              key: uid(),
              weight: s.weight != null ? String(s.weight) : '',
              reps: s.reps != null ? String(s.reps) : '',
            }))
          : [emptySet()],
    })),
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
    exercises: workout.exercises.map((ex) => ({
      key: uid(),
      exerciseId: ex.exercise_id,
      name: ex.name,
      category: ex.category,
      equipmentType: ex.equipment_type,
      weightUnit: ex.weight_unit ?? defaultUnit,
      notes: ex.notes ?? '',
      sets:
        ex.sets.length > 0
          ? ex.sets.map((s) => ({
              key: uid(),
              weight: s.weight != null ? String(s.weight) : '',
              reps: s.reps != null ? String(s.reps) : '',
            }))
          : [emptySet()],
    })),
  };
}

export function exerciseToDraft(exercise: ExerciseRow, unit: WeightUnit): DraftExercise {
  return {
    key: uid(),
    exerciseId: exercise.id,
    name: exercise.name,
    category: exercise.category,
    equipmentType: exercise.equipment_type,
    weightUnit: unit,
    notes: '',
    sets: [emptySet()],
  };
}

type Action =
  | { type: 'reset'; draft: WorkoutDraft }
  | { type: 'setWorkoutField'; field: 'date' | 'startTime' | 'endTime' | 'notes'; value: string }
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
      field: 'weight' | 'reps';
      value: string;
    };

function mapExercise(
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
        sets: original.sets.map((s) => ({ ...s, key: uid() })),
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
      return mapExercise(draft, action.key, (ex) => ({ ...ex, [action.field]: action.value }));

    case 'addSet':
      return mapExercise(draft, action.exerciseKey, (ex) => {
        // New set inherits the previous set's values as a starting point.
        const prev = ex.sets[ex.sets.length - 1];
        const seed: DraftSet = prev
          ? { key: uid(), weight: prev.weight, reps: prev.reps }
          : emptySet();
        return { ...ex, sets: [...ex.sets, seed] };
      });

    case 'removeSet':
      return mapExercise(draft, action.exerciseKey, (ex) => ({
        ...ex,
        sets: ex.sets.filter((s) => s.key !== action.setKey),
      }));

    case 'setSetField':
      return mapExercise(draft, action.exerciseKey, (ex) => ({
        ...ex,
        sets: ex.sets.map((s) =>
          s.key === action.setKey ? { ...s, [action.field]: action.value } : s,
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
