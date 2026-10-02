import { createContext } from 'react';
import type {
  IntervalConfig,
  IntervalSnapshot,
  TimerSettings,
  TimerState,
} from '@/lib/timerEngine';

export const TIMER_STORAGE_KEY = 'gym-tracker:timers';

/**
 * Live timer readings. This value changes several times a second while a timer
 * is running, so only components that display time should subscribe to it.
 */
export interface TimerStateContextValue {
  state: TimerState;
  /** Wall-clock time (epoch ms) the readings below were derived from. */
  now: number;
  restRemainingMs: number;
  stopwatchElapsedMs: number;
  interval: IntervalSnapshot;
}

/**
 * Stable timer controls. This object never changes identity, so components
 * that only start/stop timers (e.g. every set row) don't re-render on ticks.
 */
export interface TimerActionsContextValue {
  startRest: (durationSec: number) => void;
  /** One-tap start from a logged set, using the last rest length picked. */
  startRestFromSet: (label?: string) => void;
  pauseRest: () => void;
  resumeRest: () => void;
  adjustRest: (deltaSec: number) => void;
  resetRest: () => void;

  startStopwatch: () => void;
  pauseStopwatch: () => void;
  resetStopwatch: () => void;
  linkStopwatch: (workoutId: string) => void;

  configureInterval: (config: Partial<IntervalConfig>) => void;
  /** Start a session, optionally applying config changes first. */
  startInterval: (config?: Partial<IntervalConfig>) => void;
  pauseInterval: () => void;
  resumeInterval: () => void;
  skipInterval: () => void;
  resetInterval: () => void;

  updateSettings: (settings: Partial<TimerSettings>) => void;
  /** Read the latest state synchronously (e.g. inside a save handler). */
  getState: () => TimerState;
  /** Send a message to screen readers via the shared live region. */
  announce: (message: string) => void;
}

export const TimerStateContext = createContext<TimerStateContextValue | undefined>(undefined);
export const TimerActionsContext = createContext<TimerActionsContextValue | undefined>(undefined);
