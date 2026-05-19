const CACHE_NAME = 'qq-export-v1';
const STATIC_CACHE_NAME = 'qq-export-static-v1';
const DYNAMIC_CACHE_NAME = 'qq-export-dynamic-v1';

// Assets to pre-cache during installation
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// API endpoints that should be network-first
const NETWORK_FIRST_URLS = [
  '/api/',
  '/auth/',
];

// Assets that should be cache-first (static assets)
const CACHE_FIRST_URLS = [
  '.js',
  '.css',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Precaching static assets');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[ServiceWorker] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');

  const cacheWhitelist = [CACHE_NAME, STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME];

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Determine caching strategy based on URL
  if (shouldUseNetworkFirst(url.pathname)) {
    event.respondWith(networkFirst(request));
  } else if (shouldUseCacheFirst(url.pathname)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

function shouldUseNetworkFirst(pathname) {
  return NETWORK_FIRST_URLS.some(url => pathname.startsWith(url));
}

function shouldUseCacheFirst(pathname) {
  return CACHE_FIRST_URLS.some(ext => pathname.endsWith(ext));
}

// Network First strategy for dynamic content
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Fallback to cache when offline
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[ServiceWorker] Serving from cache (offline):', request.url);
      return cachedResponse;
    }

    // Return offline fallback response
    return getOfflineFallback();
  }
}

// Cache First strategy for static assets
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Update cache in background
    fetchAndCache(request);

    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Failed to fetch:', request.url, error);
    return new Response('Offline', { status: 503 });
  }
}

// Stale While Revalidate strategy (default)
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        try {
          // Clone before using to avoid "body already used" error
          const clonedResponse = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            cache.put(request, clonedResponse);
          });
        } catch (e) {
          console.warn('[ServiceWorker] Failed to cache response:', e);
        }
      }
      return networkResponse;
    })
    .catch(() => {
      if (!cachedResponse) {
        return getOfflineFallback();
      }
      throw new Error('Network request failed');
    });

  return cachedResponse || fetchPromise;
}

// Background fetch and cache update
async function fetchAndCache(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response);
    }
  } catch (error) {
    // Silent fail for background updates
  }
}

// Get offline fallback response
async function getOfflineFallback() {
  const offlineUrl = '/offline.html';
  
  try {
    const cachedOffline = await caches.match(offlineUrl);
    if (cachedOffline) {
      return cachedOffline;
    }
  } catch (e) {
    // Ignore
  }

  return new Response(
    JSON.stringify({
      error: 'You are offline',
      message: 'Please check your internet connection and try again.',
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      clearAllCaches()
        .then(() => {
          event.target.postMessage({ type: 'CACHE_CLEARED' });
        });
      break;

    case 'GET_CACHE_SIZE':
      getCacheSize()
        .then((size) => {
          event.target.postMessage({
            type: 'CACHE_SIZE',
            data: size,
          });
        });
      break;

    default:
      console.warn('[ServiceWorker] Unknown message type:', type);
  }
});

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('[ServiceWorker] All caches cleared');
}

// Get total cache size
async function getCacheSize() {
  let totalSize = 0;
  const cacheNames = await caches.keys();

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

// Push notification handling (if needed in future)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      createdAt: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'QQ Export', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;

  if (data && data.url) {
    event.waitUntil(
      clients.openWindow({
        url: data.url,
        focus: true,
      })
    );
  }
});

console.log('[ServiceWorker] Loaded successfully');
