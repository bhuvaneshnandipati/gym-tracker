/**
 * Lightweight debug logger for the Timer feature.
 *
 * - Always keeps the most recent entries in an in-memory ring buffer, so a bug
 *   report can include them (`getTimerLog()` / `formatTimerLog()`).
 * - Prints to the console only in development, or in production when the user
 *   opts in by running `localStorage.setItem('gym-tracker:debug', 'timers')`
 *   in the browser console (remove the key to turn it off again).
 * - When console output is on, `window.__gymTrackerTimerLog()` dumps the buffer.
 *
 * Mirrors the project's existing conventions: no logging dependency, the
 * `gym-tracker:` localStorage prefix, and console.warn/error for problems.
 */

export type TimerLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface TimerLogEntry {
  /** ISO timestamp. */
  t: string;
  level: TimerLogLevel;
  event: string;
  data?: Record<string, unknown>;
}

export const TIMER_DEBUG_STORAGE_KEY = 'gym-tracker:debug';
const MAX_ENTRIES = 200;
const buffer: TimerLogEntry[] = [];

function consoleEnabled(): boolean {
  try {
    if (import.meta.env?.MODE === 'test') return false;
    if (import.meta.env?.DEV) return true;
    return (
      typeof window !== 'undefined' &&
      window.localStorage.getItem(TIMER_DEBUG_STORAGE_KEY) === 'timers'
    );
  } catch {
    return false;
  }
}

function write(level: TimerLogLevel, event: string, data?: Record<string, unknown>): void {
  const entry: TimerLogEntry = { t: new Date().toISOString(), level, event, data };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();

  // Problems always reach the console; routine events only in debug mode.
  if (level === 'error') console.error('[timer]', event, data ?? '');
  else if (level === 'warn') console.warn('[timer]', event, data ?? '');
  else if (consoleEnabled()) console.debug(`[timer] ${event}`, data ?? '');
}

export const timerLog = {
  debug: (event: string, data?: Record<string, unknown>) => write('debug', event, data),
  info: (event: string, data?: Record<string, unknown>) => write('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => write('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => write('error', event, data),
};

/** A copy of the buffered entries, oldest first. */
export function getTimerLog(): TimerLogEntry[] {
  return buffer.slice();
}

/** Plain-text dump, one entry per line — handy to paste into an issue. */
export function formatTimerLog(entries: TimerLogEntry[] = buffer): string {
  return entries
    .map(
      (e) =>
        `${e.t} ${e.level.toUpperCase().padEnd(5)} ${e.event}${e.data ? ` ${JSON.stringify(e.data)}` : ''}`,
    )
    .join('\n');
}

export function clearTimerLog(): void {
  buffer.length = 0;
}

// Expose a console helper only while debugging is on.
if (typeof window !== 'undefined' && consoleEnabled()) {
  (window as unknown as { __gymTrackerTimerLog?: () => string }).__gymTrackerTimerLog = () =>
    formatTimerLog();
}
