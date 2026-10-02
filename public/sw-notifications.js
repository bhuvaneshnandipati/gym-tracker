/*
 * Imported into the generated service worker (vite.config.ts → workbox.importScripts).
 * Tapping a timer notification focuses an open app window, or opens the timer.
 */
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
