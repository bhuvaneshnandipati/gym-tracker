import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchWorkout,
  fetchWorkouts,
  fetchLastWorkout,
  saveWorkout,
  deleteWorkout,
  duplicateWorkout,
  type SaveWorkoutInput,
} from '@/api/workouts';
import { queryKeys } from '@/lib/queryClient';

export function useWorkouts() {
  return useQuery({ queryKey: queryKeys.workouts, queryFn: fetchWorkouts });
}

/**
 * A single workout. `enabled` lets the editor stop refetching once the draft
 * has been hydrated, so auto-save invalidations don't re-read a row the editor
 * is already the source of truth for.
 */
export function useWorkout(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: id ? queryKeys.workout(id) : ['workout', 'none'],
    queryFn: () => fetchWorkout(id as string),
    enabled: Boolean(id) && enabled,
  });
}

export function useLastWorkout() {
  return useQuery({ queryKey: queryKeys.lastWorkout, queryFn: fetchLastWorkout });
}

function useInvalidateWorkouts() {
  const qc = useQueryClient();
  return (id?: string) => {
    void qc.invalidateQueries({ queryKey: queryKeys.workouts });
    void qc.invalidateQueries({ queryKey: queryKeys.lastWorkout });
    if (id) void qc.invalidateQueries({ queryKey: queryKeys.workout(id) });
  };
}

export function useSaveWorkout() {
  const invalidate = useInvalidateWorkouts();
  return useMutation({
    mutationFn: (input: SaveWorkoutInput) => saveWorkout(input),
    onSuccess: (_id, variables) => invalidate(variables.id),
  });
}

export function useDeleteWorkout() {
  const invalidate = useInvalidateWorkouts();
  return useMutation({
    mutationFn: (id: string) => deleteWorkout(id),
    onSuccess: (_void, id) => invalidate(id),
  });
}

export function useDuplicateWorkout() {
  const invalidate = useInvalidateWorkouts();
  return useMutation({
    mutationFn: (id: string) => duplicateWorkout(id),
    onSuccess: () => invalidate(),
  });
}
