import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FullPageSpinner } from '@/components/FullPageSpinner';
import { closeLocalStore, initLocalStore, subscribeLocalStore } from '@/lib/localStore';

/**
 * Loads the signed-in user's on-device data before rendering the app, and
 * refreshes every screen whenever that data changes (a local edit, a sync, or
 * an edit in another tab).
 */
export function LocalDataGate({ userId, children }: { userId: string; children: ReactNode }) {
  const qc = useQueryClient();
  const [readyFor, setReadyFor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    qc.clear();
    void initLocalStore(userId).then(() => {
      if (!cancelled) setReadyFor(userId);
    });
    return () => {
      cancelled = true;
      closeLocalStore();
      setReadyFor(null);
    };
  }, [userId, qc]);

  useEffect(() => subscribeLocalStore(() => void qc.invalidateQueries()), [qc]);

  if (readyFor !== userId) return <FullPageSpinner />;
  return <>{children}</>;
}
