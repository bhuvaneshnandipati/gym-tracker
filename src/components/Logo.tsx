import { cn } from '@/utils/cn';

/** Brand mark: a flame-orange dumbbell glyph with wordmark. */
export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-iron-950 dark:bg-iron-800">
        <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true">
          <g stroke="#ff5a1f" strokeWidth="2.4" strokeLinecap="round">
            <line x1="11" y1="16" x2="21" y2="16" />
            <line x1="8" y1="12" x2="8" y2="20" />
            <line x1="24" y1="12" x2="24" y2="20" />
            <line x1="11" y1="13.5" x2="11" y2="18.5" />
            <line x1="21" y1="13.5" x2="21" y2="18.5" />
          </g>
        </svg>
      </span>
      {showText ? (
        <span className="text-lg font-bold tracking-tight text-iron-900 dark:text-iron-50">
          Gym<span className="text-flame-600 dark:text-flame-500">Tracker</span>
        </span>
      ) : null}
    </span>
  );
}
