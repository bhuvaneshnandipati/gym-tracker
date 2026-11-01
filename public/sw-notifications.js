/*
 * Imported into the generated service worker (vite.config.ts → workbox.importScripts).
 *
 * 1. Backup rest timer. Phones pause a backgrounded page, so the page's own
 *    timer can't be trusted to fire "Rest finished". When a rest starts, the
 *    page sends its end time here; the worker holds the timer (kept alive with
 *    event.waitUntil, which browsers honour for a few minutes) and shows the
 *    notification itself, unless the app is on screen at that moment.
 *    Messages: { type: 'rest:schedule', id, at, title, body, url } and
 *    { type: 'rest:cancel' }.
 * 2. Tapping a timer notification focuses an open app window, or opens the timer.
 */
const REST_TAG = 'gym-tracker-rest';
let pendingRest = null; // { id, timer, resolve }

function cancelPendingRest() {
  if (!pendingRest) return;
  clearTimeout(pendingRest.timer);
  pendingRest.resolve();
  pendingRest = null;
}

async function anyWindowVisible() {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return windows.some((client) => client.visibilityState === 'visible');
}

async function fireRest(msg) {
  // On screen, the page plays its own sound and vibration instead.
  if (await anyWindowVisible()) return;
  const existing = await self.registration.getNotifications({ tag: REST_TAG });
  if (existing.some((n) => n.data && n.data.restId === msg.id)) return;
  await self.registration.showNotification(msg.title || 'Rest finished', {
    body: msg.body || 'Time for your next set.',
    tag: REST_TAG,
    renotify: true,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [250, 120, 250, 120, 400],
    timestamp: msg.at,
    data: { url: msg.url || '/timer?mode=rest', restId: msg.id },
  });
}

self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || typeof msg.type !== 'string') return;

  if (msg.type === 'rest:cancel') {
    cancelPendingRest();
    return;
  }

  if (msg.type === 'rest:schedule') {
    cancelPendingRest();
    const delay = Math.max(0, msg.at - Date.now());
    event.waitUntil(
      new Promise((resolve) => {
        const entry = { id: msg.id, resolve, timer: 0 };
        entry.timer = setTimeout(() => {
          if (pendingRest === entry) pendingRest = null;
          fireRest(msg)
            .catch(() => undefined)
            .then(resolve);
        }, delay);
        pendingRest = entry;
      }),
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        // Focus only: navigating would reload the page and could interrupt
        // an unsaved workout draft. The timer pill is visible on every screen.
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
