const CACHE_NAME = 'ristruttura-v2';

// Pre-cache solo le risorse statiche principali alla root corretta
const ASSETS = [
  '/',
  '/index.html',
  '/app.css',
  '/js/app.js',
  '/logo.png',
  '/icon.png',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
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
  // Non intercettare richieste API o cross-origin
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Aggiorna cache con risposta fresca
        if (response && response.status === 200 && e.request.method === 'GET') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
