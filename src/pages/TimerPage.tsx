import { useRef, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Hourglass, Repeat, Timer as TimerIcon } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { RestTimerPanel } from '@/components/timer/RestTimerPanel';
import { StopwatchPanel } from '@/components/timer/StopwatchPanel';
import { IntervalTimerPanel } from '@/components/timer/IntervalTimerPanel';
import { TimerAlertsCard } from '@/components/timer/TimerAlertsCard';
import { useTimerState } from '@/hooks/useTimers';
import { cn } from '@/utils/cn';

type Mode = 'rest' | 'stopwatch' | 'interval';

const TABS: { id: Mode; label: string; icon: typeof TimerIcon }[] = [
  { id: 'rest', label: 'Rest', icon: Hourglass },
  { id: 'stopwatch', label: 'Stopwatch', icon: TimerIcon },
  { id: 'interval', label: 'Intervals', icon: Repeat },
];

const isMode = (v: string | null): v is Mode =>
  v === 'rest' || v === 'stopwatch' || v === 'interval';

export function TimerPage() {
  const [params, setParams] = useSearchParams();
  const mode: Mode = isMode(params.get('mode')) ? (params.get('mode') as Mode) : 'rest';
  const { state, interval } = useTimerState();
  const tabRefs = useRef<Record<Mode, HTMLButtonElement | null>>({
    rest: null,
    stopwatch: null,
    interval: null,
  });

  const select = (next: Mode) => setParams({ mode: next }, { replace: true });

  // Arrow-key navigation between tabs (WAI-ARIA tabs pattern).
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = TABS.findIndex((t) => t.id === mode);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    event.preventDefault();
    const id = TABS[next].id;
    select(id);
    tabRefs.current[id]?.focus();
  };

  // A dot on tabs whose timer is running elsewhere.
  const live: Record<Mode, boolean> = {
    rest: state.rest.status === 'running' || state.rest.status === 'paused',
    stopwatch: state.stopwatch.status !== 'idle',
    interval: interval.status === 'running' || interval.status === 'paused',
  };

  return (
    <>
      <PageHeader
        title="Timer"
        description="Rest between sets, time your session, or run intervals."
      />

      <div
        role="tablist"
        aria-label="Timer mode"
        className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-iron-100 p-1 dark:bg-iron-900"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const selected = id === mode;
          return (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[id] = el;
              }}
              type="button"
              role="tab"
              id={`timer-tab-${id}`}
              aria-selected={selected}
              aria-controls={`timer-panel-${id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(id)}
              onKeyDown={onTabKey}
              className={cn(
                'flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors',
                selected
                  ? 'bg-white text-flame-700 shadow-card dark:bg-iron-800 dark:text-flame-400 dark:shadow-card-dark'
                  : 'text-iron-600 hover:text-iron-900 dark:text-iron-400 dark:hover:text-iron-100',
              )}
            >
              <Icon className="hidden h-5 w-5 min-[400px]:block" aria-hidden="true" />
              {label}
              {live[id] && !selected ? (
                <span className="-mt-3 h-2 w-2 shrink-0 rounded-full bg-flame-500">
                  <span className="sr-only">(running)</span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`timer-panel-${mode}`}
        aria-labelledby={`timer-tab-${mode}`}
        tabIndex={-1}
        className="outline-none"
      >
        {mode === 'rest' ? <RestTimerPanel /> : null}
        {mode === 'stopwatch' ? <StopwatchPanel /> : null}
        {mode === 'interval' ? <IntervalTimerPanel /> : null}
      </div>

      <TimerAlertsCard />
    </>
  );
}
