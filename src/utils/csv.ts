import Papa from 'papaparse';
import type { WorkoutWithExercises } from '@/types/workout';
import type { SaveWorkoutInput, SaveSetInput } from '@/api/workouts';
import { CATEGORIES, EQUIPMENT_TYPES, type Category, type EquipmentType } from '@/lib/categories';
import { TRACKING_TYPES, inferTrackingType, type TrackingType } from '@/lib/exerciseMetrics';

const HEADERS = [
  'date',
  'start_time',
  'end_time',
  'duration_seconds',
  'tracking_type',
  'exercise',
  'category',
  'equipment',
  'weight_unit',
  'set_number',
  'weight',
  'reps',
  'set_duration_seconds',
  'distance',
  'speed',
  'incline',
  'calories',
  'exercise_notes',
  'workout_notes',
] as const;

const blank = (v: number | null) => (v == null ? '' : v);

/** Flatten workouts to one CSV row per set (round-trips with the importer). */
export function workoutsToCSV(workouts: WorkoutWithExercises[]): string {
  const rows: (string | number)[][] = [HEADERS as unknown as string[]];

  for (const w of [...workouts].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const ex of w.exercises) {
      const base = [w.date, w.start_time ?? '', w.end_time ?? '', w.duration_seconds ?? ''];
      const exCols = [ex.tracking_type, ex.name, ex.category, ex.equipment_type, ex.weight_unit];
      const tail = [ex.notes ?? '', w.notes ?? ''];

      if (ex.sets.length === 0) {
        rows.push([...base, ...exCols, '', '', '', '', '', '', '', '', ...tail]);
        continue;
      }
      ex.sets.forEach((set, i) => {
        rows.push([
          ...base,
          ...exCols,
          i + 1,
          blank(set.weight),
          blank(set.reps),
          blank(set.duration_seconds),
          blank(set.distance),
          blank(set.speed),
          blank(set.incline),
          blank(set.calories),
          ...tail,
        ]);
      });
    }
  }

  return Papa.unparse(rows);
}

/** Trigger a browser download of text content. */
export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ParsedImport {
  workouts: SaveWorkoutInput[];
  rowCount: number;
  errors: string[];
}

type Row = Record<string, string>;

function coerceCategory(value: string): Category {
  const v = value?.trim().toLowerCase();
  return (CATEGORIES as readonly string[]).includes(v) ? (v as Category) : 'other';
}
function coerceEquipment(value: string): EquipmentType {
  const v = value?.trim().toLowerCase();
  return (EQUIPMENT_TYPES as readonly string[]).includes(v) ? (v as EquipmentType) : 'other';
}
function coerceTracking(
  value: string,
  category: Category,
  equipment: EquipmentType,
  name: string,
): TrackingType {
  const v = value?.trim().toLowerCase();
  if ((TRACKING_TYPES as readonly string[]).includes(v)) return v as TrackingType;
  return inferTrackingType(category, equipment, name);
}
function num(value: string): number | null {
  const t = (value ?? '').trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
function int(value: string): number | null {
  const v = num(value);
  return v != null ? Math.round(v) : null;
}

function emptySaveSet(): SaveSetInput {
  return {
    weight: null,
    reps: null,
    durationSeconds: null,
    distance: null,
    speed: null,
    incline: null,
    calories: null,
  };
}

/**
 * Parse CSV (in the export format) into save-ready workouts. Rows are grouped
 * into one workout per date, and into exercises by name within that date.
 */
export function parseWorkoutsCSV(text: string): ParsedImport {
  const errors: string[] = [];
  const result = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });

  if (result.errors.length) {
    for (const e of result.errors.slice(0, 5)) errors.push(`Row ${e.row}: ${e.message}`);
  }

  const byDate = new Map<string, SaveWorkoutInput>();

  for (const row of result.data) {
    const date = (row.date ?? '').trim();
    const exercise = (row.exercise ?? '').trim();
    if (!date || !exercise) continue;

    let workout = byDate.get(date);
    if (!workout) {
      workout = {
        date,
        startTime: (row.start_time ?? '').trim() || null,
        endTime: (row.end_time ?? '').trim() || null,
        durationSeconds: num(row.duration_seconds ?? ''),
        notes: (row.workout_notes ?? '').trim() || null,
        exercises: [],
      };
      byDate.set(date, workout);
    }

    let ex = workout.exercises.find((e) => e.name === exercise);
    if (!ex) {
      const category = coerceCategory(row.category ?? '');
      const equipmentType = coerceEquipment(row.equipment ?? '');
      ex = {
        exerciseId: null,
        name: exercise,
        category,
        equipmentType,
        weightUnit: (row.weight_unit ?? '').trim() === 'kg' ? 'kg' : 'lbs',
        trackingType: coerceTracking(row.tracking_type ?? '', category, equipmentType, exercise),
        notes: (row.exercise_notes ?? '').trim() || null,
        sets: [],
      };
      workout.exercises.push(ex);
    }

    const set: SaveSetInput = {
      ...emptySaveSet(),
      weight: num(row.weight ?? ''),
      reps: int(row.reps ?? ''),
      durationSeconds: int(row.set_duration_seconds ?? ''),
      distance: num(row.distance ?? ''),
      speed: num(row.speed ?? ''),
      incline: num(row.incline ?? ''),
      calories: int(row.calories ?? ''),
    };
    const hasData = Object.values(set).some((v) => v != null);
    if (hasData) ex.sets.push(set);
  }

  const workouts = [...byDate.values()]
    .map((w) => ({ ...w, exercises: w.exercises.filter((e) => e.sets.length > 0) }))
    .filter((w) => w.exercises.length > 0);

  return { workouts, rowCount: result.data.length, errors };
}
