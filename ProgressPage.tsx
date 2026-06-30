import { QueryClient } from '@tanstack/react-query';

/** Shared TanStack Query client. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Keep cached data long enough to be useful offline (persisted to storage).
      gcTime: 1000 * 60 * 60 * 24,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Centralised query keys so invalidation stays consistent. */
export const queryKeys = {
  exercises: ['exercises'] as const,
  workouts: ['workouts'] as const,
  workout: (id: string) => ['workout', id] as const,
  lastWorkout: ['workout', 'last'] as const,
};
