const CACHE_NAME = 'forge-ai-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json',
  '/logo-invictuswave.svg'
];

// Use a stale-while-revalidate strategy for assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET and chrome-extension requests
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension')) return;

  // For API requests, try network first, then fallback to cache if available (for read-only data)
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful API GET requests for offline fallback
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cached => {
            if (cached) return cached;
            return new Response(JSON.stringify({ error: 'offline', message: 'Koneksi gym terputus. Data mungkin belum diperbarui.' }), { 
              status: 503,
              headers: { 'Content-Type': 'application/json' } 
            });
          });
        })
    );
    return;
  }

  // For static assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => null);
      
      return cached || fetched;
    })
  );
});

// Focus or open PWA window when clicking notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
            break;
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
