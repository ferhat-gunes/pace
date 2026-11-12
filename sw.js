const CACHE = 'pace-shell-v13';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/icons/pace.png',
  '/assets/icons/pace.svg',
  '/assets/icons/pace-180.png',
  '/assets/icons/pace-192.png',
  '/assets/icons/pace-512.png',
  '/assets/icons/pace-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith('pace-shell-') && k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET and cross-origin or API requests
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // HTML Navigation: Network-first with fast timeout fallback to cached /index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1800);
        try {
          const res = await fetch(req, { cache: 'no-cache', signal: controller.signal });
          if (res.ok) {
            await cache.put('/index.html', res.clone());
          }
          return res;
        } catch {
          const cached = await cache.match('/index.html', { ignoreVary: true });
          return cached || Response.error();
        } finally {
          clearTimeout(timer);
        }
      })()
    );
    return;
  }

  // Static Assets (/assets/*, fonts, scripts, css, images): Cache-first with network fallback
  if (url.pathname.startsWith('/assets/') || SHELL.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;

        try {
          const res = await fetch(req);
          if (res.ok) {
            await cache.put(req, res.clone());
          }
          return res;
        } catch {
          return Response.error();
        }
      })()
    );
  }
});

// Notification Click handler: focus PACE window or navigate to target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

