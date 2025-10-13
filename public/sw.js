// Service Worker for Preferred Solutions Transport
// Provides offline functionality and background sync

const CACHE_NAME = 'pst-v1';
const RUNTIME_CACHE = 'pst-runtime-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/driver',
  '/dispatcher',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching assets');
      return cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    }).catch(err => {
      console.error('[SW] Precache failed:', err);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response if available
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline response for API calls
            return new Response(
              JSON.stringify({ error: 'Offline', offline: true }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          });
        })
    );
    return;
  }

  // Static assets - cache first, network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone and cache
        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });

        return response;
      }).catch(() => {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/offline');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Background Sync - sync pending data when online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-status-updates') {
    event.waitUntil(syncStatusUpdates());
  }
  
  if (event.tag === 'sync-location-updates') {
    event.waitUntil(syncLocationUpdates());
  }
});

// Sync pending status updates
async function syncStatusUpdates() {
  try {
    const cache = await caches.open('pending-updates');
    const requests = await cache.keys();
    
    for (const request of requests) {
      if (request.url.includes('/api/orders/') && request.url.includes('/status')) {
        try {
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            const data = await cachedResponse.json();
            // Retry the request
            const response = await fetch(request.url, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            
            if (response.ok) {
              await cache.delete(request);
              console.log('[SW] Synced status update');
            }
          }
        } catch (err) {
          console.error('[SW] Failed to sync status update:', err);
        }
      }
    }
  } catch (err) {
    console.error('[SW] Background sync failed:', err);
  }
}

// Sync pending location updates
async function syncLocationUpdates() {
  try {
    const cache = await caches.open('pending-updates');
    const requests = await cache.keys();
    
    for (const request of requests) {
      if (request.url.includes('/api/drivers/location')) {
        try {
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            const data = await cachedResponse.json();
            // Retry the request
            const response = await fetch('/api/drivers/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            
            if (response.ok) {
              await cache.delete(request);
              console.log('[SW] Synced location update');
            }
          }
        } catch (err) {
          console.error('[SW] Failed to sync location update:', err);
        }
      }
    }
  } catch (err) {
    console.error('[SW] Location sync failed:', err);
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'New Notification', body: event.data.text() };
    }
  }
  
  const title = data.title || 'Preferred Solutions Transport';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: data.tag || 'default',
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

console.log('[SW] Service worker loaded');

