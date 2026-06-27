// ─── JCOMMERCE SERVICE WORKER ─────────────────────────────────────────────────
// Handles Web Push notifications even when app is closed/phone locked
const CACHE = 'jcommerce-v1';

// Install — cache the shell
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

// ── PUSH HANDLER — fires when JAXON sends a push ─────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return;

  let data;
  try { data = e.data.json(); }
  catch { data = { title: 'JAXON', body: e.data.text() }; }

  const { title, body, type, url, badge } = data;

  // Pick icon based on alert type
  const iconMap = {
    MORNING_WAKE_UP:  '/logo192.png',
    HABIT_REMINDER:   '/logo192.png',
    TODO_REMINDER:    '/logo192.png',
    RETAINER_OVERDUE: '/logo192.png',
    HOT_LEAD:         '/logo192.png',
    RESEARCH_FINDING: '/logo192.png',
  };

  const options = {
    body,
    icon:  iconMap[type] || '/logo192.png',
    badge: '/logo192.png',
    tag:   type || 'jaxon-alert',    // replaces previous notification of same type
    renotify: true,
    requireInteraction: ['RETAINER_OVERDUE','MORNING_WAKE_UP'].includes(type),
    data: { url: url || '/', type },
    actions: type === 'HABIT_REMINDER' ? [
      { action: 'open', title: '✓ Mark Done' },
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
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new tab
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ── BACKGROUND SYNC (for offline queued actions) ─────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'jaxon-sync') {
    console.log('[SW] Background sync triggered');
  }
});
