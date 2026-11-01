import { useSyncExternalStore } from 'react';
import {
  getLocalState,
  isLocalStoreReady,
  pendingCount,
  subscribeLocalStore,
  type LocalState,
} from '@/lib/localStore';

/** The current local store snapshot (null until loaded for the signed-in user). */
export function useLocalState(): LocalState | null {
  return useSyncExternalStore(
    subscribeLocalStore,
    () => (isLocalStoreReady() ? getLocalState() : null),
    () => null,
  );
}

/** How many local changes are waiting for "Sync to cloud", and when it last ran. */
export function useLocalSyncInfo(): { pending: number; lastSyncedAt: string | null } {
  const state = useLocalState();
  return {
    pending: state ? pendingCount(state) : 0,
    lastSyncedAt: state?.lastSyncedAt ?? null,
  };
}
