import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client.
 *
 * Queries and mutations read and write the on-device store
 * (src/lib/localStore.ts), so they run with `networkMode: 'always'`: they
 * never pause while offline and never retry. The store itself persists the
 * data, so the query cache is not persisted.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always',
      staleTime: Infinity,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      networkMode: 'always',
      retry: false,
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
