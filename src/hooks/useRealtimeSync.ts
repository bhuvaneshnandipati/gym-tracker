import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryClient';
import { bodyMetricsQueryKey } from '@/hooks/useBodyMetrics';

/**
 * Subscribes to Postgres changes for the current user and invalidates the
 * relevant queries, so edits made on another device appear here in real time.
 * Requires the tables to be in the `supabase_realtime` publication (migration 0004).
 */
export function useRealtimeSync() {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    const client = supabase;
    if (!client || !user) return;

    const channel = client
      .channel(`db-changes-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workouts', filter: `user_id=eq.${user.id}` },
        () => {
          void qc.invalidateQueries({ queryKey: queryKeys.workouts });
          void qc.invalidateQueries({ queryKey: queryKeys.lastWorkout });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'body_metrics', filter: `user_id=eq.${user.id}` },
        () => {
          void qc.invalidateQueries({ queryKey: bodyMetricsQueryKey });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [qc, user]);
}
