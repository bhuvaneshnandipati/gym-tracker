/**
 * Keeps the screen awake while a timer runs, using the Screen Wake Lock API.
 *
 * Why: phones dim and lock after ~30 s, and a locked phone suspends the page,
 * which is the main reason a rest/interval beep can be missed. Holding a wake
 * lock while a timer is running keeps the page alive and the readout visible.
 *
 * The browser releases the lock automatically whenever the page is hidden
 * (tab switch, app switch), so the controller re-acquires it when the page
 * becomes visible again — as long as it is still wanted.
 *
 * Supported in Chrome/Edge/Android and Safari 16.4+. Elsewhere it is a no-op.
 * No permission prompt is involved.
 */

import { timerLog } from '@/lib/timerLogger';

/** The parts of the environment the controller needs (injectable for tests). */
export interface WakeLockEnv {
  request: (() => Promise<WakeLockSentinel>) | null;
  isVisible: () => boolean;
}

export function browserWakeLockEnv(): WakeLockEnv {
  const supported =
    typeof navigator !== 'undefined' &&
    'wakeLock' in navigator &&
    typeof navigator.wakeLock?.request === 'function';
  return {
    request: supported ? () => navigator.wakeLock.request('screen') : null,
    isVisible: () => typeof document === 'undefined' || document.visibilityState === 'visible',
  };
}

export function isWakeLockSupported(): boolean {
  return browserWakeLockEnv().request !== null;
}

export interface WakeLockController {
  /** Declare whether the screen should be kept awake. Safe to call repeatedly. */
  setWanted: (wanted: boolean) => void;
  /** Call when the page becomes visible again to restore a dropped lock. */
  onVisible: () => void;
  /** True while a lock is actually held. */
  isHeld: () => boolean;
  /** Release and stop (e.g. on unmount). */
  dispose: () => void;
}

export function createWakeLockController(
  env: WakeLockEnv = browserWakeLockEnv(),
): WakeLockController {
  let wanted = false;
  let sentinel: WakeLockSentinel | null = null;
  let pending = false;

  const acquire = () => {
    if (!env.request || !wanted || sentinel || pending || !env.isVisible()) return;
    pending = true;
    env
      .request()
      .then((lock) => {
        pending = false;
        if (!wanted) {
          // Turned off while the request was in flight.
          void lock.release().catch(() => undefined);
          return;
        }
        sentinel = lock;
        timerLog.debug('wakelock.acquired');
        lock.addEventListener('release', () => {
          if (sentinel === lock) sentinel = null;
          timerLog.debug('wakelock.released');
        });
      })
      .catch((error: unknown) => {
        pending = false;
        // Commonly NotAllowedError (battery saver, or page not visible yet).
        timerLog.warn('wakelock.request_failed', { error: String(error) });
      });
  };

  const release = () => {
    const lock = sentinel;
    sentinel = null;
    if (lock) void lock.release().catch(() => undefined);
  };

  return {
    setWanted: (next) => {
      wanted = next;
      if (wanted) acquire();
      else release();
    },
    onVisible: () => acquire(),
    isHeld: () => sentinel !== null,
    dispose: () => {
      wanted = false;
      release();
    },
  };
}
