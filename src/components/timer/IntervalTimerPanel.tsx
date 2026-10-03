import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { BigButton } from '@/components/timer/TimerControls';
import { TimerReadout } from '@/components/timer/TimerReadout';
import { useTimerActions, useTimerState } from '@/hooks/useTimers';
import {
  INTERVAL_LIMITS,
  PHASE_LABELS,
  ceilSeconds,
  floorSeconds,
  formatTimer,
  intervalTotalMs,
  sanitizeIntervalConfig,
  type IntervalConfig,
  type PhaseKind,
} from '@/lib/timerEngine';
import { cn } from '@/utils/cn';

/** Colour per phase so the current phase reads at a glance across the room. */
const PHASE_TONES: Record<PhaseKind, { text: string; badge: string }> = {
  warmup: {
    text: 'text-amber-500 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  },
  work: {
    text: 'text-flame-600 dark:text-flame-500',
    badge: 'bg-flame-100 text-flame-800 dark:bg-flame-950/50 dark:text-flame-300',
  },
  rest: {
    text: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300',
  },
  cooldown: {
    text: 'text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300',
  },
};

type FieldKey = keyof IntervalConfig;

const FIELDS: { key: FieldKey; label: string; hint: string; min: number; max: number }[] = [
  { key: 'workSec', label: 'Work', hint: 'sec', ...INTERVAL_LIMITS.workSec },
  { key: 'restSec', label: 'Rest', hint: 'sec', ...INTERVAL_LIMITS.phaseSec },
  { key: 'rounds', label: 'Rounds', hint: '', ...INTERVAL_LIMITS.rounds },
  { key: 'warmupSec', label: 'Warm-up', hint: 'sec', ...INTERVAL_LIMITS.phaseSec },
  { key: 'cooldownSec', label: 'Cool-down', hint: 'sec', ...INTERVAL_LIMITS.phaseSec },
];

const toStrings = (c: IntervalConfig) =>
  Object.fromEntries(Object.entries(c).map(([k, v]) => [k, String(v)])) as Record<FieldKey, string>;

/** Work/rest rounds with optional warm-up and cool-down. */
export function IntervalTimerPanel() {
  const { state, interval } = useTimerState();
  const actions = useTimerActions();
  const { config, status } = state.interval;
  const active = status === 'running' || status === 'paused';

  // Inputs keep their own text so a field can be cleared while typing.
  const [values, setValues] = useState(() => toStrings(config));
  useEffect(() => setValues(toStrings(config)), [config]);

  const draftConfig = sanitizeIntervalConfig(
    Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v.trim() === '' ? Number.NaN : Number(v)]),
    ) as Partial<IntervalConfig>,
  );

  const commit = () => actions.configureInterval(draftConfig);

  if (!active) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <h2 className="text-base font-semibold tracking-tight text-iron-900 dark:text-iron-50">
            Set up intervals
          </h2>
          <form
            className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              actions.startInterval(draftConfig);
            }}
            noValidate
          >
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="mb-1.5 block text-sm font-medium text-iron-700 dark:text-iron-300">
                  {f.label}
                  {f.hint ? (
                    <span className="font-normal text-iron-400 dark:text-iron-500">
                      {' '}
                      ({f.hint})
                    </span>
                  ) : null}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={f.min}
                  max={f.max}
                  step="1"
                  value={values[f.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  onBlur={commit}
                  className="h-12 w-full rounded-xl border border-iron-300 bg-white px-3 text-base tabular-nums text-iron-900 focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-500/40 dark:border-iron-700 dark:bg-iron-900 dark:text-iron-100"
                />
              </label>
            ))}

            <div className="col-span-2 mt-2 flex flex-col gap-3 sm:col-span-3">
              <p className="text-xs text-iron-500 dark:text-iron-400">
                Set warm-up or cool-down to 0 to skip it. There&apos;s no rest after the last round.
              </p>
              <p className="text-sm text-iron-500 dark:text-iron-400" aria-live="polite">
                Total time:{' '}
                <span className="font-semibold tabular-nums text-iron-800 dark:text-iron-200">
                  {formatTimer(intervalTotalMs(draftConfig) / 1000)}
                </span>{' '}
                · {draftConfig.rounds} round{draftConfig.rounds === 1 ? '' : 's'}
              </p>
              <BigButton tone="primary" type="submit" className="w-full">
                <Play className="h-6 w-6" aria-hidden="true" />
                {status === 'finished' ? 'Start again' : 'Start intervals'}
              </BigButton>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="text-base font-semibold tracking-tight text-iron-900 dark:text-iron-50">
            Sounds
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-iron-600 dark:text-iron-300">
            <li>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-semibold',
                  PHASE_TONES.work.badge,
                )}
              >
                Work
              </span>{' '}
              sharp double beep
            </li>
            <li>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-semibold',
                  PHASE_TONES.rest.badge,
                )}
              >
                Rest
              </span>{' '}
              long low tone
            </li>
            <li>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-semibold',
                  PHASE_TONES.warmup.badge,
                )}
              >
                Warm-up
              </span>{' '}
              rising tone ·{' '}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-semibold',
                  PHASE_TONES.cooldown.badge,
                )}
              >
                Cool-down
              </span>{' '}
              falling tone
            </li>
            <li>3-2-1 short beeps before every change, and a three-note chime when done.</li>
          </ul>
          {status === 'finished' ? (
            <p className="mt-4 rounded-xl bg-green-50 px-3 py-2 text-sm font-medium text-green-800 dark:bg-green-950/40 dark:text-green-300">
              Session complete — nice work!
            </p>
          ) : null}
        </Card>
      </div>
    );
  }

  const seg = interval.segment;
  const tone = seg ? PHASE_TONES[seg.kind] : PHASE_TONES.work;
  const segProgress = seg ? interval.segmentRemainingMs / seg.durationMs : 0;
  const overall = interval.totalMs > 0 ? interval.elapsedMs / interval.totalMs : 0;

  return (
    <Card className="flex flex-col items-center gap-5 py-8">
      {seg ? (
        <div className="flex flex-wrap items-center justify-center gap-2 text-center">
          <span
            className={cn(
              'rounded-full px-4 py-1.5 text-lg font-bold uppercase tracking-wide',
              tone.badge,
            )}
          >
            {PHASE_LABELS[seg.kind]}
          </span>
          {seg.round ? (
            <span className="text-lg font-semibold tabular-nums text-iron-700 dark:text-iron-200">
              Round {seg.round}/{interval.totalRounds}
            </span>
          ) : null}
        </div>
      ) : null}

      <TimerReadout
        seconds={ceilSeconds(interval.segmentRemainingMs)}
        label={seg ? `${PHASE_LABELS[seg.kind]} time remaining` : 'Time remaining'}
        progress={segProgress}
        toneClass={tone.text}
        muted={status === 'paused'}
        caption={status === 'paused' ? 'Paused' : undefined}
      />

      <div className="w-full max-w-md">
        <div className="flex justify-between text-xs font-medium text-iron-500 dark:text-iron-400">
          <span>Elapsed {formatTimer(floorSeconds(interval.elapsedMs))}</span>
          <span>Left {formatTimer(ceilSeconds(interval.totalMs - interval.elapsedMs))}</span>
        </div>
        <div
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-iron-200 dark:bg-iron-800"
          role="progressbar"
          aria-label="Session progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(overall * 100)}
        >
          <div
            className="h-full rounded-full bg-flame-600"
            style={{ width: `${overall * 100}%` }}
          />
        </div>
      </div>

      <div className="grid w-full max-w-md grid-cols-3 gap-3">
        {status === 'running' ? (
          <BigButton tone="primary" onClick={actions.pauseInterval} aria-label="Pause intervals">
            <Pause className="h-6 w-6" aria-hidden="true" />
          </BigButton>
        ) : (
          <BigButton tone="primary" onClick={actions.resumeInterval} aria-label="Resume intervals">
            <Play className="h-6 w-6" aria-hidden="true" />
          </BigButton>
        )}
        <BigButton onClick={actions.skipInterval} aria-label="Skip to next phase">
          <SkipForward className="h-6 w-6" aria-hidden="true" />
        </BigButton>
        <BigButton
          tone="danger"
          onClick={actions.resetInterval}
          aria-label="Stop and reset intervals"
        >
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
        </BigButton>
      </div>
    </Card>
  );
}
