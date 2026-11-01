import { CloudUpload, Loader2 } from 'lucide-react';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useLocalSyncInfo } from '@/hooks/useLocalData';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';
import { formatRelativeTime } from '@/utils/datetime';

/** Summarise a sync for a toast. */
function describe(uploaded: number, deleted: number, failures: number): string {
  const parts: string[] = [];
  if (uploaded) parts.push(`${uploaded} uploaded`);
  if (deleted) parts.push(`${deleted} deleted`);
  const summary = parts.length ? ` (${parts.join(', ')})` : '';
  return failures
    ? `Synced with ${failures} problem${failures === 1 ? '' : 's'}${summary}. Unsynced items are kept on this device and will retry next time.`
    : `Synced to cloud${summary}`;
}

/**
 * "Sync to cloud": the only way app data reaches the database.
 * Shows how many local changes are waiting.
 */
export function SyncButton({
  showLabel = false,
  className,
}: {
  showLabel?: boolean;
  className?: string;
}) {
  const { sync, isSyncing } = useCloudSync();
  const { pending, lastSyncedAt } = useLocalSyncInfo();
  const toast = useToast();

  const handleClick = async () => {
    const outcome = await sync();
    if (outcome.ok) {
      const { uploaded, deleted, failures } = outcome.result;
      if (failures.length) toast.error(describe(uploaded, deleted, failures.length));
      else toast.success(describe(uploaded, deleted, 0));
    } else if (outcome.reason === 'offline') {
      toast.info(outcome.message);
    } else {
      toast.error(outcome.message);
    }
  };

  const title = isSyncing
    ? 'Syncing…'
    : `Sync to cloud — ${pending ? `${pending} change${pending === 1 ? '' : 's'} waiting` : 'nothing waiting'}. Last synced ${formatRelativeTime(lastSyncedAt)}.`;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSyncing}
      title={title}
      aria-label={title}
      className={cn(
        'relative inline-flex h-9 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors',
        'text-iron-700 hover:bg-iron-100 disabled:opacity-60 dark:text-iron-200 dark:hover:bg-iron-800',
        showLabel ? 'px-3' : 'w-9',
        className,
      )}
    >
      {isSyncing ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <CloudUpload className="h-5 w-5" />
      )}
      {showLabel ? <span>{isSyncing ? 'Syncing…' : 'Sync to cloud'}</span> : null}
      {pending > 0 && !isSyncing ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-flame-600 px-1 text-[11px] font-semibold leading-none text-white">
          {pending > 99 ? '99+' : pending}
        </span>
      ) : null}
    </button>
  );
}
