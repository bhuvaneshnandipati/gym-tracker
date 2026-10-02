import { useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BigButton } from '@/components/timer/TimerControls';
import { TimerReadout } from '@/components/timer/TimerReadout';
import { useTimerActions, useTimerState } from '@/hooks/useTimers';
import { floorSeconds } from '@/lib/timerEngine';
import { timeFromISO } from '@/utils/datetime';

/** Total session time with start / pause / resume / reset. */
export function StopwatchPanel() {
  const { state, stopwatchElapsedMs } = useTimerState();
  const actions = useTimerActions();
  const { stopwatch } = state;
  const [confirmReset, setConfirmReset] = useState(false);

  const startedAt = stopwatch.firstStartedAt
    ? timeFromISO(new Date(stopwatch.firstStartedAt).toISOString())
    : null;

  return (
    <Card className="flex flex-col items-center gap-6 py-8">
      <TimerReadout
        seconds={floorSeconds(stopwatchElapsedMs)}
        label="Workout time"
        muted={stopwatch.status === 'paused'}
        caption={
          stopwatch.status === 'idle'
            ? 'Not started'
            : stopwatch.status === 'paused'
              ? `Paused · started ${startedAt}`
              : `Started ${startedAt}`
        }
      />

      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        {stopwatch.status === 'running' ? (
          <BigButton
            tone="primary"
            onClick={actions.pauseStopwatch}
            aria-label="Pause workout timer"
          >
            <Pause className="h-6 w-6" aria-hidden="true" />
            Pause
          </BigButton>
        ) : (
          <BigButton
            tone="primary"
            onClick={actions.startStopwatch}
            aria-label={
              stopwatch.status === 'paused' ? 'Resume workout timer' : 'Start workout timer'
            }
          >
            <Play className="h-6 w-6" aria-hidden="true" />
            {stopwatch.status === 'paused' ? 'Resume' : 'Start'}
          </BigButton>
        )}
        <BigButton
          tone="danger"
          onClick={() => setConfirmReset(true)}
          disabled={stopwatch.status === 'idle'}
          aria-label="Reset workout timer"
        >
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
          Reset
        </BigButton>
      </div>

      <p className="max-w-md text-center text-sm text-iron-500 dark:text-iron-400">
        Keeps running while you move around the app, and through a page refresh. When you save a new
        workout, its duration is taken from this timer (paused time excluded).
      </p>

      <ConfirmDialog
        open={confirmReset}
        title="Reset workout timer?"
        message="The elapsed time will be cleared. This can't be undone."
        confirmLabel="Reset"
        danger
        onConfirm={() => {
          actions.resetStopwatch();
          setConfirmReset(false);
        }}
        onClose={() => setConfirmReset(false)}
      />
    </Card>
  );
}
