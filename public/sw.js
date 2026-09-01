// FinDashboard Pro - minimal service worker.
//
// Strategy: network-first, cache as an offline fallback only. Deliberately NOT
// cache-first / precached, to avoid the classic PWA pitfall of serving a stale
// build after a new deploy - all financial data itself lives in localStorage
// and is untouched by this cache, only the static app shell (JS/CSS/HTML) is
// cached here.
const CACHE_NAME = 'findashboard-pro-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error()))
  );
});
