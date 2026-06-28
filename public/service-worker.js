// ─── JCOMMERCE SERVICE WORKER ─────────────────────────────────────────────────
const CACHE = 'jcommerce-v1';

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

// ── PUSH HANDLER ──────────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return;

  let data;
  try { data = e.data.json(); }
  catch { data = { title: 'JAXON', body: e.data.text() }; }

  const { title, body, type, url } = data;

  const options = {
    body,
    icon:  '/icon-192.png',
    badge: '/icon-192.png',
    tag:   type || 'jaxon-alert',
    renotify: true,
    requireInteraction: ['RETAINER_OVERDUE','MORNING_WAKE_UP'].includes(type),
    data: { url: url || '/', type },
    actions: type === 'HABIT_REMINDER' ? [
      { action: 'open',    title: '✓ Mark Done' },
      { action: 'dismiss', title: 'Later' },
    ] : [
      { action: 'open', title: 'Open JAXON' },
    ],
    vibrate: type === 'RETAINER_OVERDUE' ? [200,100,200,100,200] : [100,50,100],
  };

  e.waitUntil(
    self.registration.showNotification(title || 'JAXON Intelligence', options)
  );
});

// ── NOTIFICATION CLICK ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const targetUrl = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client)
          return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('sync', e => {
  if (e.tag === 'jaxon-sync') console.log('[SW] Background sync triggered');
});