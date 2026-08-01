/**
 * Exercise coaching metadata — types, lookup key, and lazy loader.
 *
 * The dataset itself lives in `src/data/exerciseCoaching.ts` and is loaded with
 * a dynamic import so it stays out of the main bundle: nothing is fetched until
 * a user actually opens a coaching card. Results are cached at module scope, so
 * the chunk is downloaded and parsed at most once per session.
 *
 * Coaching content is static reference material. It is deliberately NOT stored
 * in the database and never triggers a query.
 */

import type { EquipmentType } from '@/lib/categories';

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/** Tailwind classes for a difficulty badge (light + dark). */
export const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  beginner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  advanced: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
};

export interface CoachingMuscles {
  primary: string[];
  secondary: string[];
}

export interface ExerciseCoaching {
  /** 3–6 concise posture cues. */
  posture: string[];
  /** Short breathing instructions. */
  breathing: string[];
  /** Frequent execution errors. */
  mistakes: string[];
  muscles: CoachingMuscles;
  equipment: EquipmentType;
  difficulty: Difficulty;
}

export type CoachingLibrary = Record<string, ExerciseCoaching>;

/** Normalised lookup key: case, spacing and hyphenation insensitive. */
export function coachingKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, ' ');
}

let cache: CoachingLibrary | null = null;
let inFlight: Promise<CoachingLibrary> | null = null;

/** Synchronously return the library if it has already been loaded. */
export function peekCoachingLibrary(): CoachingLibrary | null {
  return cache;
}

/** Load (once) and cache the coaching library. */
export async function loadCoachingLibrary(): Promise<CoachingLibrary> {
  if (cache) return cache;
  if (!inFlight) {
    inFlight = import('@/data/exerciseCoaching')
      .then((mod) => {
        cache = mod.EXERCISE_COACHING;
        return cache;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** Look an exercise up in an already-loaded library. */
export function findCoaching(
  library: CoachingLibrary | null,
  name: string,
): ExerciseCoaching | null {
  if (!library) return null;
  return library[coachingKey(name)] ?? null;
}
