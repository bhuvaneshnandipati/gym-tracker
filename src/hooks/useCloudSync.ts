import { useCallback, useSyncExternalStore } from 'react';
import { getSupabase } from '@/lib/supabase';
import { getLocalState } from '@/lib/localStore';
import { supabaseRemote, syncWithCloud, type SyncResult } from '@/lib/cloudSync';
import { syncLog } from '@/lib/syncLogger';
import { useAuth } from '@/hooks/useAuth';

export type SyncOutcome =
  | { ok: true; result: SyncResult }
  | { ok: false; reason: 'offline' | 'signed_out' | 'error'; message: string };

// Module-level so every Sync button shows the same spinner.
let syncing = false;
const listeners = new Set<() => void>();
const setSyncing = (value: boolean) => {
  syncing = value;
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/**
 * The one entry point that talks to the database for app data. Called only
 * from the "Sync to cloud" button, never automatically.
 */
export function useCloudSync() {
  const { refreshProfile } = useAuth();
  const isSyncing = useSyncExternalStore(
    subscribe,
    () => syncing,
    () => false,
  );

  const sync = useCallback(async (): Promise<SyncOutcome> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        ok: false,
        reason: 'offline',
        message: "You're offline. Your data is safe on this device; sync when you're connected.",
      };
    }

    setSyncing(true);
    try {
      const client = getSupabase();
      // Online now, so this refreshes an expired access token if needed.
      const { data, error } = await client.auth.getSession();
      const session = data.session;
      if (error || !session) {
        syncLog.warn('sync.no_session', { message: error?.message });
        return {
          ok: false,
          reason: 'signed_out',
          message: 'Your sign-in has expired. Sign out and back in, then sync again.',
        };
      }
      if (session.user.id !== getLocalState().userId) {
        return {
          ok: false,
          reason: 'signed_out',
          message: 'Signed-in account changed. Reload the app.',
        };
      }

      const result = await syncWithCloud(supabaseRemote(client));
      await refreshProfile().catch(() => undefined);
      return { ok: true, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      syncLog.error('sync.failed', { message });
      return {
        ok: false,
        reason: navigator.onLine ? 'error' : 'offline',
        message: `Sync failed: ${message}`,
      };
    } finally {
      setSyncing(false);
    }
  }, [refreshProfile]);

  return { sync, isSyncing };
}
