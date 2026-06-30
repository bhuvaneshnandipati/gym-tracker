import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchExercises,
  createCustomExercise,
  deleteCustomExercise,
  type CreateExerciseInput,
} from '@/api/exercises';
import { queryKeys } from '@/lib/queryClient';

export function useExercises() {
  return useQuery({
    queryKey: queryKeys.exercises,
    queryFn: fetchExercises,
    staleTime: 5 * 60_000,
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExerciseInput) => createCustomExercise(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.exercises }),
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCustomExercise(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.exercises }),
  });
}
