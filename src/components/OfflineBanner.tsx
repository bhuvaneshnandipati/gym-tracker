import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Shows an offline notice, and on reconnect resumes any mutations that were
 * paused while offline and refetches data so the UI catches up.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const qc = useQueryClient();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      void qc.resumePausedMutations().then(() => qc.invalidateQueries());
    }
  }, [online, qc]);

  if (online) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-iron-800 px-4 py-2 text-center text-sm font-medium text-iron-100">
      <WifiOff className="h-4 w-4" />
      You&apos;re offline. Changes will sync when you reconnect.
    </div>
  );
}
