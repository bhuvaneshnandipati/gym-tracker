import { Hourglass, Repeat, Timer as TimerIcon, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTimerActions, useTimerState } from '@/hooks/useTimers';
import { PHASE_LABELS, ceilSeconds, floorSeconds, formatTimer } from '@/lib/timerEngine';
import { cn } from '@/utils/cn';

/**
 * Small floating readout of the most relevant running timer, shown on every
 * app screen except the Timer page itself. Tapping it opens the right tab.
 * Priority: rest countdown → interval session → workout stopwatch.
 */
export function MiniTimerPill() {
  const { state, restRemainingMs, stopwatchElapsedMs, interval } = useTimerState();
  const { resetRest } = useTimerActions();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (pathname.startsWith('/timer')) return null;

  const { rest, stopwatch } = state;
  let mode: 'rest' | 'interval' | 'stopwatch' | null = null;
  if (rest.status !== 'idle') mode = 'rest';
  else if (interval.status === 'running' || interval.status === 'paused') mode = 'interval';
  else if (stopwatch.status !== 'idle') mode = 'stopwatch';
  if (!mode) return null;

  let icon = TimerIcon;
  let label = '';
  let time = '';
  let finished = false;
  let paused = false;

  if (mode === 'rest') {
    icon = Hourglass;
    finished = rest.status === 'finished';
    paused = rest.status === 'paused';
    label = finished ? 'Rest done' : 'Rest';
    time = finished ? 'Go!' : formatTimer(ceilSeconds(restRemainingMs));
  } else if (mode === 'interval') {
    icon = Repeat;
    paused = interval.status === 'paused';
    const seg = interval.segment;
    label = seg
      ? `${PHASE_LABELS[seg.kind]}${seg.round ? ` ${seg.round}/${interval.totalRounds}` : ''}`
      : 'Intervals';
    time = formatTimer(ceilSeconds(interval.segmentRemainingMs));
  } else {
    paused = stopwatch.status === 'paused';
    label = 'Workout';
    time = formatTimer(floorSeconds(stopwatchElapsedMs));
  }

  const Icon = icon;
  const spokenState = finished ? '' : paused ? ', paused' : '';

  return (
    <div
      className="fixed bottom-20 left-4 z-30 flex items-center lg:bottom-8 lg:left-72"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <button
        type="button"
        onClick={() => navigate(`/timer?mode=${mode}`)}
        aria-label={`${label} ${time}${spokenState}. Open timer.`}
        className={cn(
          'flex h-12 items-center gap-2 rounded-full border pl-3 pr-4 text-sm font-semibold shadow-card backdrop-blur transition-colors active:scale-95 dark:shadow-card-dark',
          finished
            ? 'border-green-300 bg-green-50/95 text-green-800 dark:border-green-800 dark:bg-green-950/90 dark:text-green-200'
            : 'border-iron-200 bg-white/95 text-iron-900 hover:bg-iron-50 dark:border-iron-700 dark:bg-iron-900/95 dark:text-iron-50 dark:hover:bg-iron-800',
          mode === 'rest' && finished && 'rounded-r-none pr-3',
        )}
      >
        <Icon
          className={cn(
            'h-5 w-5',
            finished ? 'text-green-600 dark:text-green-400' : 'text-flame-600 dark:text-flame-500',
          )}
          aria-hidden="true"
        />
        <span className="text-iron-500 dark:text-iron-400">{label}</span>
        <span className={cn('tabular-nums', paused && 'opacity-60')}>{time}</span>
      </button>
      {mode === 'rest' && finished ? (
        <button
          type="button"
          onClick={resetRest}
          aria-label="Dismiss rest timer"
          className="flex h-12 w-11 items-center justify-center rounded-r-full border border-l-0 border-green-300 bg-green-50/95 text-green-700 shadow-card hover:bg-green-100 dark:border-green-800 dark:bg-green-950/90 dark:text-green-300"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
