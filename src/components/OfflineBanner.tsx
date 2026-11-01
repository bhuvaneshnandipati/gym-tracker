import { CloudOff, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useLocalSyncInfo } from '@/hooks/useLocalData';
import { SyncButton } from '@/components/sync/SyncButton';

/**
 * Status strip above the top bar.
 *
 * - Offline: reassures that everything is saved on this device.
 * - Never synced on this device: invites a first sync to bring down data from
 *   the account. Nothing syncs automatically, including on reconnect.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const { lastSyncedAt } = useLocalSyncInfo();

  if (!online) {
    return (
      <div className="flex items-center justify-center gap-2 bg-iron-800 px-4 py-2 text-center text-sm font-medium text-iron-100">
        <WifiOff className="h-4 w-4 shrink-0" />
        You&apos;re offline. Everything is saved on this device.
      </div>
    );
  }

  if (!lastSyncedAt) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-iron-100 px-4 py-2 text-center text-sm text-iron-700 dark:bg-iron-900 dark:text-iron-200">
        <span className="flex items-center gap-2">
          <CloudOff className="h-4 w-4 shrink-0" />
          Data is saved on this device only. Sync to back it up and load your cloud data.
        </span>
        <SyncButton showLabel className="h-8" />
      </div>
    );
  }

  return null;
}
