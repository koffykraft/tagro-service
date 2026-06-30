// TAGRO Service Worker v3 — static hosting + offline workshop use
const CACHE = 'tagro-v3';
const CORE = [
  './', './index.html', './login.html', './home.html', './receive.html', './work.html',
  './tracker.html', './purchase.html', './tech.html', './catalog.html', './parts.html',
  './reports.html', './links.html', './config.html', './setup.html', './staff-admin.html',
  './app.js', './app.css', './parts-search.js', './manifest.json',
  './icon-192.png', './icon-512.png', './TAGRO Parts Master Template.xlsx'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.url.includes('workers.dev') || request.url.includes('dropbox')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request).then(cached => cached || caches.match('./login.html'))));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
    return response;
  })));
});
