import { AlertCircle, Check, Loader2 } from 'lucide-react';
import type { SaveStatus } from '@/hooks/useAutoSave';
import { cn } from '@/utils/cn';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  /** Retry handler, used when a save failed. */
  onRetry?: () => void;
  className?: string;
}

const STYLES: Record<Exclude<SaveStatus, 'idle'>, string> = {
  saving: 'text-iron-500 dark:text-iron-400',
  saved: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
};

/** Compact auto-save state: Saving… / Saved on device ✓ / Save failed. */
export function SaveStatusIndicator({ status, onRetry, className }: SaveStatusIndicatorProps) {
  if (status === 'idle') return null;

  const classes = cn('flex items-center gap-1.5 text-xs font-medium', STYLES[status], className);

  if (status === 'saving') {
    return (
      <span className={classes} role="status" aria-live="polite">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    );
  }

  if (status === 'saved') {
    return (
      <span className={classes} role="status" aria-live="polite">
        <Check className="h-3.5 w-3.5" />
        Saved on device
      </span>
    );
  }

  return (
    <span className={classes} role="status" aria-live="polite">
      <AlertCircle className="h-3.5 w-3.5" />
      Save failed
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="underline underline-offset-2 hover:no-underline"
        >
          Retry
        </button>
      ) : null}
    </span>
  );
}
