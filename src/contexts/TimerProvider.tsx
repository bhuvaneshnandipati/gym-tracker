import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  TIMER_STORAGE_KEY,
  TimerActionsContext,
  TimerStateContext,
  type TimerActionsContextValue,
  type TimerStateContextValue,
} from '@/contexts/timer-context';
import {
  PHASE_LABELS,
  buildIntervalPlan,
  ceilSeconds,
  intervalCues,
  intervalSnapshot,
  parseTimerState,
  restCues,
  restRemainingMs,
  sanitizeIntervalConfig,
  serializeTimerState,
  spokenDuration,
  stopwatchElapsedMs,
  timerReducer,
  type TimerAction,
  type TimerState,
} from '@/lib/timerEngine';
import {
  cancelAllCues,
  playCueNow,
  scheduleCues,
  setAudioUnlockListener,
  unlockAudio,
  vibrate,
} from '@/lib/timerSound';
import { timerLog } from '@/lib/timerLogger';
import { createWakeLockController } from '@/lib/wakeLock';
import { clearRestNotification, showRestDoneNotification } from '@/lib/timerNotify';

/** How often the display refreshes while something is running. */
const TICK_MS = 250;
/** How often long interval sessions top up their audio schedule. */
const RESCHEDULE_MS = 60_000;
/** Transitions noticed later than this (tab throttled / phone asleep) skip vibration. */
const STALE_MS = 5_000;

function loadState(): TimerState {
  try {
    return parseTimerState(window.localStorage.getItem(TIMER_STORAGE_KEY));
  } catch (error) {
    timerLog.warn('state.load_failed', { error: String(error) });
    return parseTimerState(null);
  }
}

/**
 * Owns all timer state for the app.
 *
 * Mounted once above the router so timers keep running while the user moves
 * between screens. State is persisted to localStorage on every change, which
 * (because it is timestamp-based) is enough to survive a full page reload.
 */
export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(timerReducer, undefined, loadState);
  const [now, setNow] = useState(() => Date.now());
  const [announcement, setAnnouncement] = useState('');

  const stateRef = useRef(state);
  stateRef.current = state;

  const anyRunning =
    state.rest.status === 'running' ||
    state.stopwatch.status === 'running' ||
    state.interval.status === 'running';

  // ------------------------------------------------------------- clock tick
  useEffect(() => {
    if (!anyRunning) return;
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [anyRunning]);

  // Catch up immediately when the tab/app becomes visible again.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        timerLog.debug('clock.visible');
        setNow(Date.now());
      }
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('pageshow', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('pageshow', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  // Move timers that have reached zero into their finished state.
  useEffect(() => {
    dispatch({ type: 'settle', now });
  }, [now]);

  // ------------------------------------------------------------ persistence
  useEffect(() => {
    try {
      window.localStorage.setItem(TIMER_STORAGE_KEY, serializeTimerState(state));
    } catch (error) {
      timerLog.warn('state.save_failed', { error: String(error) });
    }
  }, [state]);

  // Keep several open tabs in sync (and avoid double beeps).
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TIMER_STORAGE_KEY || event.newValue == null) return;
      if (event.newValue === serializeTimerState(stateRef.current)) return;
      timerLog.debug('state.sync_from_other_tab');
      dispatch({ type: 'hydrate', state: parseTimerState(event.newValue) });
      setNow(Date.now());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // -------------------------------------------------------------- wake lock
  // Keep the screen on while anything runs so the page isn't suspended by
  // the phone locking (the main cause of missed beeps).
  const wakeLock = useRef<ReturnType<typeof createWakeLockController> | null>(null);
  useEffect(() => {
    const controller = createWakeLockController();
    wakeLock.current = controller;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') controller.onVisible();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      controller.dispose();
      wakeLock.current = null;
    };
  }, []);

  useEffect(() => {
    wakeLock.current?.setWanted(anyRunning && state.settings.keepAwake);
  }, [anyRunning, state.settings.keepAwake]);

  // A "Rest finished" notification is stale once the user is back in the app.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void clearRestNotification();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // ------------------------------------------------------------------ audio
  // Browsers need a gesture before audio can play; after a reload, the first
  // tap anywhere re-enables scheduled cues.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    scheduleCues('rest', restCues(state.rest, Date.now()), state.settings.sound);
  }, [state.rest, state.settings.sound]);

  useEffect(() => {
    const schedule = () =>
      scheduleCues(
        'interval',
        intervalCues(stateRef.current.interval, Date.now()),
        stateRef.current.settings.sound,
      );
    schedule();
    if (state.interval.status !== 'running') return;
    const id = window.setInterval(schedule, RESCHEDULE_MS);
    return () => window.clearInterval(id);
  }, [state.interval, state.settings.sound]);

  // Once audio is unlocked (first tap after a reload), queue any pending cues.
  useEffect(() => {
    setAudioUnlockListener(() => {
      const { rest, interval, settings } = stateRef.current;
      scheduleCues('rest', restCues(rest, Date.now()), settings.sound);
      scheduleCues('interval', intervalCues(interval, Date.now()), settings.sound);
    });
    return () => {
      setAudioUnlockListener(null);
      cancelAllCues();
    };
  }, []);

  // ---------------------------------------------------------- announcements
  const announce = useCallback((message: string) => {
    // Clear first so repeating the same text is still announced.
    setAnnouncement('');
    window.setTimeout(() => setAnnouncement(message), 50);
  }, []);

  // ---------------------------------------------------------------- derived
  const restLeft = restRemainingMs(state.rest, now);
  const swElapsed = stopwatchElapsedMs(state.stopwatch, now);
  const snapshot = useMemo(() => intervalSnapshot(state.interval, now), [state.interval, now]);

  // ------------------------------------------- transitions (vibrate + speak)
  const prevRest = useRef(state.rest.status);
  useEffect(() => {
    const prev = prevRest.current;
    prevRest.current = state.rest.status;
    if (prev === 'running' && state.rest.status === 'finished') {
      const late = Date.now() - (state.rest.finishedAt ?? Date.now());
      timerLog.info('rest.finished', { lateMs: late });
      if (late < STALE_MS) vibrate('restDone', state.settings.vibration);
      announce('Rest finished. Time for your next set.');
      // Only worth a system notification when the app isn't in front.
      if (state.settings.notifications && document.visibilityState === 'hidden') {
        void showRestDoneNotification();
      }
    }
  }, [
    state.rest.status,
    state.rest.finishedAt,
    state.settings.vibration,
    state.settings.notifications,
    announce,
  ]);

  const prevSegment = useRef(`${snapshot.status}:${snapshot.segmentIndex}`);
  const lastTickSecond = useRef<number | null>(null);
  useEffect(() => {
    const key = `${snapshot.status}:${snapshot.segmentIndex}`;
    const changed = key !== prevSegment.current;
    const wasRunning = prevSegment.current.startsWith('running');
    prevSegment.current = key;
    const { vibration } = state.settings;

    if (changed && snapshot.status === 'finished' && wasRunning) {
      timerLog.info('interval.finished');
      vibrate('done', vibration);
      announce('Interval session complete. Great work!');
      return;
    }

    if (changed && snapshot.status === 'running' && snapshot.segment) {
      const seg = snapshot.segment;
      const late = snapshot.elapsedMs - seg.startMs;
      timerLog.info('interval.phase', { kind: seg.kind, round: seg.round, lateMs: late });
      if (late < STALE_MS && snapshot.segmentIndex > 0) vibrate(seg.kind, vibration);
      const round = seg.round ? `, round ${seg.round} of ${snapshot.totalRounds}` : '';
      announce(
        `${PHASE_LABELS[seg.kind]}${round}. ${spokenDuration(ceilSeconds(snapshot.segmentRemainingMs))}.`,
      );
      lastTickSecond.current = null;
      return;
    }

    // Short buzz on 3-2-1 (audio ticks are scheduled separately).
    if (snapshot.status === 'running') {
      const secLeft = ceilSeconds(snapshot.segmentRemainingMs);
      if (secLeft >= 1 && secLeft <= 3 && lastTickSecond.current !== secLeft) {
        lastTickSecond.current = secLeft;
        vibrate('tick', vibration);
      }
    }
  }, [snapshot, state.settings, announce]);

  // ---------------------------------------------------------------- actions
  const run = useCallback((action: TimerAction, meta?: Record<string, unknown>) => {
    unlockAudio();
    timerLog.info(action.type, meta);
    dispatch(action);
    setNow(Date.now());
  }, []);

  const actions = useMemo<TimerActionsContextValue>(
    () => ({
      startRest: (durationSec) => {
        run({ type: 'rest/start', durationSec, now: Date.now() }, { durationSec });
        announce(`Rest timer started, ${spokenDuration(durationSec)}.`);
      },
      startRestFromSet: (label) => {
        const durationSec = Math.round(stateRef.current.rest.lastDurationMs / 1000);
        run({ type: 'rest/start', durationSec, now: Date.now() }, { durationSec, from: 'set' });
        announce(`Rest started${label ? ` after ${label}` : ''}, ${spokenDuration(durationSec)}.`);
      },
      pauseRest: () => {
        run({ type: 'rest/pause', now: Date.now() });
        announce('Rest timer paused.');
      },
      resumeRest: () => {
        run({ type: 'rest/resume', now: Date.now() });
        announce('Rest timer resumed.');
      },
      adjustRest: (deltaSec) => {
        run({ type: 'rest/adjust', deltaSec, now: Date.now() }, { deltaSec });
        const left = ceilSeconds(
          restRemainingMs(stateRef.current.rest, Date.now()) + deltaSec * 1000,
        );
        announce(
          `${deltaSec > 0 ? 'Added' : 'Removed'} ${Math.abs(deltaSec)} seconds. ${spokenDuration(left)} left.`,
        );
      },
      resetRest: () => {
        run({ type: 'rest/reset' });
        announce('Rest timer cleared.');
      },

      startStopwatch: () => {
        const resuming = stateRef.current.stopwatch.status === 'paused';
        run({ type: 'stopwatch/start', now: Date.now() });
        announce(resuming ? 'Workout timer resumed.' : 'Workout timer started.');
      },
      pauseStopwatch: () => {
        run({ type: 'stopwatch/pause', now: Date.now() });
        announce('Workout timer paused.');
      },
      resetStopwatch: () => {
        run({ type: 'stopwatch/reset' });
        announce('Workout timer reset.');
      },
      linkStopwatch: (workoutId) => run({ type: 'stopwatch/link', workoutId }, { workoutId }),

      configureInterval: (config) => run({ type: 'interval/configure', config }, { ...config }),
      startInterval: (config) => {
        const current = stateRef.current.interval.config;
        const finalConfig = sanitizeIntervalConfig({ ...current, ...config });
        if (config) dispatch({ type: 'interval/configure', config: finalConfig });
        run({ type: 'interval/start', now: Date.now() }, { ...finalConfig });
        // The first phase has no boundary cue, so sound it on start.
        const first = buildIntervalPlan(finalConfig)[0];
        if (first) playCueNow(first.kind, stateRef.current.settings.sound);
      },
      pauseInterval: () => {
        run({ type: 'interval/pause', now: Date.now() });
        announce('Interval timer paused.');
      },
      resumeInterval: () => {
        run({ type: 'interval/resume', now: Date.now() });
        announce('Interval timer resumed.');
      },
      skipInterval: () => run({ type: 'interval/skip', now: Date.now() }),
      resetInterval: () => {
        run({ type: 'interval/reset' });
        announce('Interval timer reset.');
      },

      updateSettings: (settings) => run({ type: 'settings/set', settings }, { ...settings }),
      getState: () => stateRef.current,
      announce,
    }),
    [run, announce],
  );

  const value = useMemo<TimerStateContextValue>(
    () => ({
      state,
      now,
      restRemainingMs: restLeft,
      stopwatchElapsedMs: swElapsed,
      interval: snapshot,
    }),
    [state, now, restLeft, swElapsed, snapshot],
  );

  return (
    <TimerActionsContext.Provider value={actions}>
      <TimerStateContext.Provider value={value}>
        {children}
        {/* Shared polite live region for timer announcements. */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>
      </TimerStateContext.Provider>
    </TimerActionsContext.Provider>
  );
}
