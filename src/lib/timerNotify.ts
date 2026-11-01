/**
 * Opt-in system notification when a rest timer ends while the app is in the
 * background (another app or tab in front).
 *
 * Notifications go through the service worker registration when there is one:
 * Android Chrome does not allow `new Notification()` from a page at all, and it
 * lets the bundled `sw-notifications.js` focus the app when the notification is
 * tapped. Without a service worker (local dev) it falls back to the page API.
 *
 * Phones pause a page that is in the background, so the page's own timer can
 * miss the moment rest ends. As a backup, the end time is also handed to the
 * service worker (`scheduleRestNotification`), which shows the notification
 * itself (public/sw-notifications.js). Browsers keep the worker alive for a few
 * minutes for this, so it is most reliable for rests under ~5 minutes, and on
 * Android Chrome. The page still shows one as a fallback if the worker didn't.
 *
 * Not available in iPhone Safari unless the app is installed to the home
 * screen (iOS 16.4+); the UI then shows the toggle as unsupported.
 */

import { timerLog } from '@/lib/timerLogger';

export const REST_NOTIFICATION_TAG = 'gym-tracker-rest';

export type NotifyPermission = NotificationPermission | 'unsupported';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotifyPermission {
  return isNotificationSupported() ? Notification.permission : 'unsupported';
}

/** Ask for permission. Must be called from a user gesture. */
export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    const result = await Notification.requestPermission();
    timerLog.info('notify.permission', { result });
    return result;
  } catch (error) {
    timerLog.warn('notify.permission_failed', { error: String(error) });
    return Notification.permission;
  }
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

const REST_TITLE = 'Rest finished';
const REST_BODY = 'Time for your next set.';

/** Id shared by the page and the worker for one rest, so it's shown only once. */
export function restNotificationId(endsAt: number): string {
  return `rest-${endsAt}`;
}

/** What the worker should be doing for the current rest state. */
export type RestScheduleCommand = { type: 'schedule'; id: string; at: number } | { type: 'cancel' };

export function restScheduleCommand(
  rest: { status: string; endsAt: number | null },
  notificationsOn: boolean,
  permission: NotifyPermission,
): RestScheduleCommand {
  if (
    rest.status === 'running' &&
    rest.endsAt != null &&
    notificationsOn &&
    permission === 'granted'
  ) {
    return { type: 'schedule', id: restNotificationId(rest.endsAt), at: rest.endsAt };
  }
  return { type: 'cancel' };
}

async function postToWorker(message: Record<string, unknown>): Promise<boolean> {
  const reg = await registration();
  const worker = reg?.active ?? reg?.waiting ?? reg?.installing ?? null;
  if (!worker) return false;
  try {
    worker.postMessage(message);
    return true;
  } catch (error) {
    timerLog.warn('notify.worker_post_failed', { error: String(error) });
    return false;
  }
}

/** Hand the rest's end time to the service worker (backup for a paused page). */
export async function scheduleRestNotification(id: string, at: number): Promise<boolean> {
  const ok = await postToWorker({
    type: 'rest:schedule',
    id,
    at,
    title: REST_TITLE,
    body: REST_BODY,
    url: '/timer?mode=rest',
  });
  timerLog.info('notify.worker_scheduled', { id, inMs: at - Date.now(), ok });
  return ok;
}

export async function cancelScheduledRestNotification(): Promise<void> {
  await postToWorker({ type: 'rest:cancel' });
}

/** True if a notification for this rest is already showing (the worker beat us). */
async function alreadyShown(reg: ServiceWorkerRegistration | null, id: string): Promise<boolean> {
  if (!reg) return false;
  try {
    const open = await reg.getNotifications({ tag: REST_NOTIFICATION_TAG });
    return open.some((n) => (n.data as { restId?: string } | null)?.restId === id);
  } catch {
    return false;
  }
}

export async function showRestDoneNotification(
  id?: string,
  title = REST_TITLE,
  body = REST_BODY,
): Promise<void> {
  if (notificationPermission() !== 'granted') return;
  const options: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body,
    tag: REST_NOTIFICATION_TAG,
    renotify: true,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [250, 120, 250, 120, 400],
    data: { url: '/timer?mode=rest', restId: id },
  };
  try {
    const reg = await registration();
    if (id && (await alreadyShown(reg, id))) {
      timerLog.info('notify.rest_done_skipped', { reason: 'worker already showed it' });
      return;
    }
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
    timerLog.info('notify.rest_done', { via: reg ? 'service-worker' : 'page' });
  } catch (error) {
    timerLog.warn('notify.show_failed', { error: String(error) });
  }
}

/**
 * Send a test notification after `delayMs`, through the same worker path a
 * real rest uses, so locking the phone during the wait is a true test.
 * Returns how it was scheduled.
 */
export async function sendTestNotification(delayMs: number): Promise<'worker' | 'page' | 'denied'> {
  if (notificationPermission() !== 'granted') return 'denied';
  const at = Date.now() + delayMs;
  const id = `test-${at}`;
  const ok = await postToWorker({
    type: 'rest:schedule',
    id,
    at,
    title: 'Test: rest finished',
    body: 'Notifications are working.',
    url: '/timer?mode=rest',
  });
  timerLog.info('notify.test_scheduled', { via: ok ? 'worker' : 'page', delayMs });
  if (ok) return 'worker';
  // No service worker (e.g. local dev): only fires if the page stays awake.
  window.setTimeout(
    () => void showRestDoneNotification(id, 'Test: rest finished', 'Notifications are working.'),
    delayMs,
  );
  return 'page';
}

/**
 * Call `onChange` when notification permission may have changed (granted or
 * revoked in system settings while the app was in the background).
 */
export function watchNotificationPermission(onChange: (p: NotifyPermission) => void): () => void {
  const emit = () => onChange(notificationPermission());
  const onVisible = () => {
    if (document.visibilityState === 'visible') emit();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', emit);

  let status: PermissionStatus | null = null;
  if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
    navigator.permissions
      .query({ name: 'notifications' as PermissionName })
      .then((s) => {
        status = s;
        s.onchange = emit;
      })
      .catch(() => undefined);
  }
  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', emit);
    if (status) status.onchange = null;
  };
}

/** Remove a stale "Rest finished" notification (e.g. once the user is back). */
export async function clearRestNotification(): Promise<void> {
  if (notificationPermission() !== 'granted') return;
  try {
    const reg = await registration();
    const open = reg ? await reg.getNotifications({ tag: REST_NOTIFICATION_TAG }) : [];
    open.forEach((n) => n.close());
  } catch {
    // Nothing to clear.
  }
}
