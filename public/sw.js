// Finanzas · service worker: lectura offline (network-first) y notificaciones push
// Mantener CACHE sincronizado con SW_CACHE en lib/pwa/cache.ts (la página /login la borra al montarse).
const CACHE = 'finanzas-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_CACHE') event.waitUntil(caches.delete(CACHE));
});

// Offline = cargas completas de páginas ya visitadas. Las peticiones RSC (navegación cliente,
// cabecera RSC / _rsc) no se cachean a propósito.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (req.headers.get('RSC') || url.searchParams.has('_rsc')) return;
  const cacheable = req.mode === 'navigate' || ['script', 'style', 'font', 'image'].includes(req.destination);
  if (!cacheable) return;
  const isLogin = url.pathname === '/login' || url.pathname.startsWith('/login/');
  event.respondWith(
    fetch(req)
      .then((res) => {
        // /login no se cachea: nunca debe servirse HTML autenticado ni guardado en su lugar.
        if (res.ok && !isLogin) {
          const copy = res.clone();
          event.waitUntil(
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}),
          );
        }
        return res;
      })
      .catch(() => {
        if (isLogin) return Response.error();
        return caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('/') : undefined) || Response.error());
      }),
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Finanzas', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list[0];
      if (existing) {
        return existing.focus().then((c) => (c || existing).navigate(target)).catch(() => self.clients.openWindow(target));
      }
      return self.clients.openWindow(target);
    }),
  );
});
