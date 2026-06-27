// TAGRO Service Worker v2 — PWA install + offline cache
const CACHE = 'tagro-v2';
const CORE = [
  '/', '/login.html', '/home.html', '/receive.html', '/work.html',
  '/bench.html', '/tracker.html', '/purchase.html', '/tech.html',
  '/parts.html', '/reports.html', '/links.html', '/config.html',
  '/staff-admin.html', '/app.js', '/app.css', '/parts-search.js',
  '/manifest.json', '/icon-192.png', '/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network first for API calls, cache first for assets
  if (e.request.url.includes('workers.dev') || e.request.url.includes('dropbox')) {
    return; // Let API calls go through normally
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
