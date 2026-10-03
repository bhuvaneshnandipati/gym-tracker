import { formatTimer, spokenDuration } from '@/lib/timerEngine';
import { cn } from '@/utils/cn';

interface TimerReadoutProps {
  /** Whole seconds to display. */
  seconds: number;
  /** What the number means, e.g. "Rest time remaining". Read by screen readers. */
  label: string;
  /** 0–1 progress for the ring; omit to hide the ring. */
  progress?: number;
  /** Tailwind text color class for the ring and digits accent. */
  toneClass?: string;
  /** Small caption under the digits (e.g. "of 1:30"). */
  caption?: string;
  /** Dim the readout (paused). */
  muted?: boolean;
}

const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Large, high-contrast time display with an optional progress ring.
 *
 * Uses role="timer" (implicitly aria-live="off") so screen readers can read
 * the current value on demand without being flooded every second; phase
 * changes are announced separately through the provider's live region.
 */
export function TimerReadout({
  seconds,
  label,
  progress,
  toneClass = 'text-flame-600 dark:text-flame-500',
  caption,
  muted,
}: TimerReadoutProps) {
  const clamped = progress == null ? null : Math.min(1, Math.max(0, progress));

  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-[18rem] items-center justify-center">
      {clamped != null ? (
        <svg
          viewBox="0 0 200 200"
          className={cn('absolute inset-0 h-full w-full -rotate-90', toneClass)}
          aria-hidden="true"
        >
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            strokeWidth="10"
            className="stroke-iron-200 dark:stroke-iron-800"
          />
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
            className="transition-[stroke-dashoffset] duration-200 ease-linear"
          />
        </svg>
      ) : null}

      <div className="relative text-center">
        <div
          role="timer"
          aria-atomic="true"
          aria-label={`${label}: ${spokenDuration(seconds)}`}
          className={cn(
            'font-display text-6xl font-bold tabular-nums tracking-tight text-iron-900 sm:text-7xl dark:text-iron-50',
            muted && 'opacity-60',
          )}
        >
          {formatTimer(seconds)}
        </div>
        {caption ? (
          <p
            className="mt-1 text-sm font-medium text-iron-500 dark:text-iron-400"
            aria-hidden="true"
          >
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}
