/** Exercise categorisation and equipment metadata, shared across the UI. */

export const CATEGORIES = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'core',
  'cardio',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  legs: 'Legs',
  core: 'Core',
  cardio: 'Cardio',
  other: 'Other',
};

/** Tailwind classes for a category badge (light + dark). */
export const CATEGORY_BADGE: Record<Category, string> = {
  chest: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  back: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  shoulders: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  biceps: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  triceps: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300',
  legs: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  core: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  cardio: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
  other: 'bg-iron-200 text-iron-700 dark:bg-iron-800 dark:text-iron-300',
};

export const EQUIPMENT_TYPES = [
  'machine',
  'free_weight',
  'cable',
  'bodyweight',
  'cardio',
  'other',
] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  machine: 'Machine',
  free_weight: 'Free weight',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  cardio: 'Cardio',
  other: 'Other',
};

export type WeightUnit = 'lbs' | 'kg';
