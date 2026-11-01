/**
 * Debug logger for the offline store and "Sync to cloud".
 *
 * - Keeps the most recent entries in memory (`getSyncLog()` / `formatSyncLog()`),
 *   so Settings can copy them into a bug report.
 * - Prints to the console in development, or in production after running
 *   `localStorage.setItem('gym-tracker:debug', 'sync')` in the browser console.
 * - Warnings and errors always reach the console.
 *
 * Same conventions as src/lib/timerLogger.ts.
 */

export type SyncLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SyncLogEntry {
  t: string;
  level: SyncLogLevel;
  event: string;
  data?: Record<string, unknown>;
}

const MAX_ENTRIES = 300;
const buffer: SyncLogEntry[] = [];

function consoleEnabled(): boolean {
  try {
    if (import.meta.env?.MODE === 'test') return false;
    if (import.meta.env?.DEV) return true;
    return (
      typeof window !== 'undefined' && window.localStorage.getItem('gym-tracker:debug') === 'sync'
    );
  } catch {
    return false;
  }
}

function write(level: SyncLogLevel, event: string, data?: Record<string, unknown>): void {
  const entry: SyncLogEntry = { t: new Date().toISOString(), level, event, data };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();

  if (import.meta.env?.MODE === 'test') return;
  if (level === 'error') console.error('[sync]', event, data ?? '');
  else if (level === 'warn') console.warn('[sync]', event, data ?? '');
  else if (consoleEnabled()) console.debug(`[sync] ${event}`, data ?? '');
}

export const syncLog = {
  debug: (event: string, data?: Record<string, unknown>) => write('debug', event, data),
  info: (event: string, data?: Record<string, unknown>) => write('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => write('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => write('error', event, data),
};

export function getSyncLog(): SyncLogEntry[] {
  return buffer.slice();
}

export function formatSyncLog(entries: SyncLogEntry[] = buffer): string {
  return entries
    .map(
      (e) =>
        `${e.t} ${e.level.toUpperCase().padEnd(5)} ${e.event}${e.data ? ` ${JSON.stringify(e.data)}` : ''}`,
    )
    .join('\n');
}

export function clearSyncLog(): void {
  buffer.length = 0;
}
