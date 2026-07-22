const CACHE_NAME = 'ristruttura-v1';
const ASSETS = [
  '/ristruttura-app/',
  '/ristruttura-app/index.html',
  '/ristruttura-app/app.css',
  '/ristruttura-app/app.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});
