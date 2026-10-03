/**
 * Opt-in system notification when a rest timer ends while the app is in the
 * background (another app or tab in front).
 *
 * Notifications go through the service worker registration when there is one:
 * Android Chrome does not allow `new Notification()` from a page at all, and it
 * lets the bundled `sw-notifications.js` focus the app when the notification is
 * tapped. Without a service worker (local dev) it falls back to the page API.
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

export async function showRestDoneNotification(): Promise<void> {
  if (notificationPermission() !== 'granted') return;
  const title = 'Rest finished';
  const options: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body: 'Time for your next set.',
    tag: REST_NOTIFICATION_TAG,
    renotify: true,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [250, 120, 250, 120, 400],
    data: { url: '/timer?mode=rest' },
  };
  try {
    const reg = await registration();
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
    timerLog.info('notify.rest_done', { via: reg ? 'service-worker' : 'page' });
  } catch (error) {
    timerLog.warn('notify.show_failed', { error: String(error) });
  }
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
