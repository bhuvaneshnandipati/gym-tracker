import { useEffect } from 'react';
import { CalendarDays, Pause, Play, Timer as TimerIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTimerActions, useTimerState } from '@/hooks/useTimers';
import { floorSeconds, formatTimer } from '@/lib/timerEngine';
import { epochToHHMM, stopwatchBelongsTo } from '@/lib/workoutTimer';
import { formatDuration } from '@/utils/datetime';

interface WorkoutSessionTimerProps {
  workoutId: string | undefined;
  startedNew: boolean;
  startTime: string;
  /** Duration derived from the start/end time inputs. */
  durationFromTimes: number | null;
  /** Stopwatch duration already stored on the draft (e.g. a saved workout). */
  activeDurationSeconds: number | null;
  /** Fill the start time when the stopwatch starts and the field is empty. */
  onFillStartTime: (hhmm: string) => void;
  /** Drop the stored stopwatch duration and fall back to start/end times. */
  onClearActiveDuration: () => void;
}

/**
 * Duration row of the workout editor, linked to the workout stopwatch.
 * Lives in its own component so the editor itself doesn't re-render on every
 * timer tick — only this row does.
 */
export function WorkoutSessionTimer({
  workoutId,
  startedNew,
  startTime,
  durationFromTimes,
  activeDurationSeconds,
  onFillStartTime,
  onClearActiveDuration,
}: WorkoutSessionTimerProps) {
  const { state, stopwatchElapsedMs } = useTimerState();
  const actions = useTimerActions();
  const sw = state.stopwatch;
  const belongs = stopwatchBelongsTo(sw, workoutId, startedNew);

  // Start time follows the stopwatch's first start, unless typed in already.
  useEffect(() => {
    if (belongs && !startTime && sw.firstStartedAt != null) {
      onFillStartTime(epochToHHMM(sw.firstStartedAt));
    }
  }, [belongs, startTime, sw.firstStartedAt, onFillStartTime]);

  if (belongs) {
    const running = sw.status === 'running';
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-flame-50/70 px-3 py-2.5 dark:bg-flame-950/20">
        <TimerIcon className="h-5 w-5 text-flame-600 dark:text-flame-500" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-iron-600 dark:text-iron-300">
            Session timer{sw.status === 'paused' ? ' (paused)' : ''}:{' '}
            <span
              role="timer"
              aria-label={`Session time ${formatTimer(floorSeconds(stopwatchElapsedMs))}`}
              className="font-semibold tabular-nums text-iron-900 dark:text-iron-50"
            >
              {formatTimer(floorSeconds(stopwatchElapsedMs))}
            </span>
          </p>
          <p className="text-xs text-iron-500 dark:text-iron-400">
            Saved as the workout duration (paused time excluded).
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="h-11 px-4"
          onClick={running ? actions.pauseStopwatch : actions.startStopwatch}
          aria-label={running ? 'Pause session timer' : 'Resume session timer'}
        >
          {running ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          {running ? 'Pause' : 'Resume'}
        </Button>
      </div>
    );
  }

  const stopwatchBusyElsewhere = sw.status !== 'idle';

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-iron-500 dark:text-iron-400">
      <span className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
        Duration:{' '}
        <span className="font-medium text-iron-700 dark:text-iron-200">
          {formatDuration(activeDurationSeconds ?? durationFromTimes)}
        </span>
        {activeDurationSeconds != null ? <span>(session timer)</span> : null}
      </span>
      {activeDurationSeconds != null ? (
        <button
          type="button"
          onClick={onClearActiveDuration}
          className="font-medium text-flame-600 hover:underline dark:text-flame-400"
        >
          Use start/end times
        </button>
      ) : null}
      {startedNew && !stopwatchBusyElsewhere ? (
        <Button
          variant="secondary"
          size="sm"
          className="ml-auto h-11 px-4"
          onClick={actions.startStopwatch}
        >
          <TimerIcon className="h-4 w-4" aria-hidden="true" />
          Start session timer
        </Button>
      ) : null}
    </div>
  );
}
