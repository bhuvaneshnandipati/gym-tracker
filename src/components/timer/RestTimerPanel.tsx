import { useState, type FormEvent } from 'react';
import { Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BigButton } from '@/components/timer/TimerControls';
import { TimerReadout } from '@/components/timer/TimerReadout';
import { useTimerActions, useTimerState } from '@/hooks/useTimers';
import {
  MAX_REST_SEC,
  REST_ADJUST_SEC,
  REST_PRESETS_SEC,
  ceilSeconds,
  formatTimer,
  presetLabel,
} from '@/lib/timerEngine';
import { cn } from '@/utils/cn';

/** Countdown between sets: presets, custom time, ±15s, pause and reset. */
export function RestTimerPanel() {
  const { state, restRemainingMs } = useTimerState();
  const actions = useTimerActions();
  const { rest } = state;

  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  const active = rest.status === 'running' || rest.status === 'paused';
  const remainingSec = ceilSeconds(restRemainingMs);
  const progress = rest.durationMs > 0 ? restRemainingMs / rest.durationMs : 0;
  const lastSec = Math.round(rest.lastDurationMs / 1000);

  const handleCustom = (event: FormEvent) => {
    event.preventDefault();
    const m = minutes.trim() === '' ? 0 : Number(minutes);
    const s = seconds.trim() === '' ? 0 : Number(seconds);
    const total = Math.round(m * 60 + s);
    if (!Number.isFinite(total) || m < 0 || s < 0 || total <= 0) {
      setCustomError('Enter a time greater than zero.');
      return;
    }
    if (total > MAX_REST_SEC) {
      setCustomError('Rest can be at most 60 minutes.');
      return;
    }
    setCustomError(null);
    actions.startRest(total);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card className="flex flex-col items-center gap-6 py-8">
        <TimerReadout
          seconds={remainingSec}
          label="Rest time remaining"
          progress={rest.status === 'idle' ? 1 : progress}
          muted={rest.status === 'paused'}
          caption={
            rest.status === 'finished'
              ? 'Rest finished — go lift!'
              : rest.status === 'paused'
                ? 'Paused'
                : active
                  ? `of ${formatTimer(Math.round(rest.durationMs / 1000))}`
                  : 'Pick a rest length'
          }
          toneClass={
            rest.status === 'finished'
              ? 'text-green-600 dark:text-green-400'
              : 'text-flame-600 dark:text-flame-500'
          }
        />

        {active ? (
          <div className="grid w-full max-w-md grid-cols-3 gap-3">
            <BigButton
              onClick={() => actions.adjustRest(-REST_ADJUST_SEC)}
              aria-label={`Remove ${REST_ADJUST_SEC} seconds`}
            >
              <Minus className="h-5 w-5" aria-hidden="true" />
              15s
            </BigButton>
            {rest.status === 'running' ? (
              <BigButton tone="primary" onClick={actions.pauseRest} aria-label="Pause rest timer">
                <Pause className="h-6 w-6" aria-hidden="true" />
              </BigButton>
            ) : (
              <BigButton tone="primary" onClick={actions.resumeRest} aria-label="Resume rest timer">
                <Play className="h-6 w-6" aria-hidden="true" />
              </BigButton>
            )}
            <BigButton
              onClick={() => actions.adjustRest(REST_ADJUST_SEC)}
              aria-label={`Add ${REST_ADJUST_SEC} seconds`}
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              15s
            </BigButton>
            <BigButton
              tone="danger"
              className="col-span-3"
              onClick={actions.resetRest}
              aria-label="Stop and clear rest timer"
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              Stop
            </BigButton>
          </div>
        ) : (
          <div className="grid w-full max-w-md grid-cols-2 gap-3">
            <BigButton
              tone="primary"
              className="col-span-2"
              onClick={() => actions.startRest(lastSec)}
              aria-label={`Start rest timer for ${presetLabel(lastSec)}`}
            >
              <Play className="h-6 w-6" aria-hidden="true" />
              {rest.status === 'finished' ? 'Again' : 'Start'} {formatTimer(lastSec)}
            </BigButton>
            {rest.status === 'finished' ? (
              <BigButton className="col-span-2" onClick={actions.resetRest}>
                Dismiss
              </BigButton>
            ) : null}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-base font-semibold tracking-tight text-iron-900 dark:text-iron-50">
          Quick presets
        </h2>
        <p className="mt-1 text-sm text-iron-500 dark:text-iron-400">
          Tap to start. The last length you pick is used by the timer button on each set.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Rest presets">
          {REST_PRESETS_SEC.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => actions.startRest(sec)}
              aria-label={`Start ${presetLabel(sec)} rest`}
              aria-pressed={lastSec === sec}
              className={cn(
                'h-14 rounded-2xl text-lg font-semibold tabular-nums transition-colors active:scale-[0.98]',
                lastSec === sec
                  ? 'bg-flame-600 text-white hover:bg-flame-700'
                  : 'bg-iron-100 text-iron-900 hover:bg-iron-200 dark:bg-iron-800 dark:text-iron-100 dark:hover:bg-iron-700',
              )}
            >
              {presetLabel(sec)}
            </button>
          ))}
        </div>

        <form onSubmit={handleCustom} className="mt-6" noValidate>
          <fieldset>
            <legend className="text-sm font-medium text-iron-700 dark:text-iron-300">
              Custom time
            </legend>
            <div className="mt-2 flex items-end gap-2">
              <label className="flex-1">
                <span className="sr-only">Minutes</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="60"
                  placeholder="min"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  aria-invalid={customError ? true : undefined}
                  aria-describedby={customError ? 'rest-custom-error' : undefined}
                  className="h-12 w-full rounded-xl border border-iron-300 bg-white px-3 text-center text-base tabular-nums text-iron-900 placeholder:text-iron-400 focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/40 dark:border-iron-700 dark:bg-iron-900 dark:text-iron-100"
                />
              </label>
              <span className="pb-3 font-semibold text-iron-400" aria-hidden="true">
                :
              </span>
              <label className="flex-1">
                <span className="sr-only">Seconds</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="59"
                  placeholder="sec"
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  aria-invalid={customError ? true : undefined}
                  aria-describedby={customError ? 'rest-custom-error' : undefined}
                  className="h-12 w-full rounded-xl border border-iron-300 bg-white px-3 text-center text-base tabular-nums text-iron-900 placeholder:text-iron-400 focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/40 dark:border-iron-700 dark:bg-iron-900 dark:text-iron-100"
                />
              </label>
              <Button type="submit" size="lg" className="px-4">
                Start
              </Button>
            </div>
            {customError ? (
              <p id="rest-custom-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                {customError}
              </p>
            ) : null}
          </fieldset>
        </form>
      </Card>
    </div>
  );
}
