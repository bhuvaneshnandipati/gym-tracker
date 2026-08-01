import { useEffect, useState } from 'react';
import {
  findCoaching,
  loadCoachingLibrary,
  peekCoachingLibrary,
  type ExerciseCoaching,
} from '@/lib/coaching';

export interface UseExerciseCoachingResult {
  coaching: ExerciseCoaching | null;
  loading: boolean;
}

/**
 * Coaching metadata for a single exercise, loaded on demand.
 *
 * Pass `enabled = false` (the default state of a collapsed card) to skip the
 * import entirely — the dataset chunk is only fetched once a card is opened,
 * and the module-level cache in `lib/coaching` makes every later card instant.
 * No database query is involved.
 */
export function useExerciseCoaching(name: string, enabled: boolean): UseExerciseCoachingResult {
  const [library, setLibrary] = useState(() => peekCoachingLibrary());

  useEffect(() => {
    if (!enabled || library) return;
    let active = true;
    void loadCoachingLibrary().then((loaded) => {
      if (active) setLibrary(loaded);
    });
    return () => {
      active = false;
    };
  }, [enabled, library]);

  return {
    coaching: findCoaching(library, name),
    loading: enabled && library === null,
  };
}
