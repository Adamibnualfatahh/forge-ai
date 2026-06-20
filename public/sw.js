const CACHE_NAME = 'forge-ai-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
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

// Web Push: show notification pushed from the server (works when PWA is closed)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Forge AI', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Forge AI';
  const options = {
    body: data.body || 'Yuk gaspol latihan! 💪',
    icon: data.icon || '/icon.svg',
    badge: data.badge || '/icon.svg',
    vibrate: [200, 100, 200],
    tag: data.tag || 'forge-rest-day-reminder',
    renotify: true,
    data: { url: data.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Re-subscribe automatically if the browser rotates the push subscription
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const keyRes = await fetch('/api/push/vapid-public-key');
      const keyData = await keyRes.json();
      if (!keyData.publicKey) return;

      const subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
      });

      const idRes = await caches.match('/__forge_profile_id');
      const profileId = idRes ? await idRes.text() : '';
      if (!profileId) return;

      await fetch(`/api/profiles/${profileId}/push-subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });
    } catch (e) {
      // best-effort; the app re-subscribes on next launch anyway
    }
  })());
});

// Helper: convert a base64 VAPID public key to the Uint8Array the Push API needs
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Focus or open PWA window when clicking notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
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
      return clients.openWindow(targetUrl);
    })
  );
});

// Background Timer for Rest Timer
let timerTimeout = null;

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SET_PROFILE_ID') {
    const id = String(event.data.profileId || '');
    event.waitUntil(
      caches.open('forge-meta').then((c) => c.put('/__forge_profile_id', new Response(id)))
    );
  }

  if (event.data?.type === 'START_REST_TIMER') {
    const { endTime, title, body } = event.data;
    const delay = endTime - Date.now();
    
    if (timerTimeout) clearTimeout(timerTimeout);
    
    if (delay > 0) {
      timerTimeout = setTimeout(() => {
        self.registration.showNotification(title || 'Rest Selesai! 💪', {
          body: body || 'Waktunya lanjut latihan! Yuk gaspol!',
          icon: '/icon.svg',
          badge: '/icon.svg',
          vibrate: [200, 100, 200, 100, 300],
          tag: 'rest-timer',
          renotify: true,
          requireInteraction: true,
          data: { url: self.location.origin }
        });
      }, delay);
    }
  }
  
  if (event.data?.type === 'CANCEL_REST_TIMER') {
    if (timerTimeout) clearTimeout(timerTimeout);
    timerTimeout = null;
  }
});
