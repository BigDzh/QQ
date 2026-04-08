const CACHE_NAME = 'lifecycle-app-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/vendor/vendor-react-00000000.js',
  '/assets/index-00000000.js',
  '/assets/css/index.css-00000000.css',
];

const EXTERNAL_ASSETS = [
  'http://fonts.googleapis.com',
  'http://fonts.gstatic.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  const getFallbackResponse = () => {
    return caches.match('/index.html').then((fallback) => {
      return fallback || new Response('Service Unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
      });
    });
  };

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetched = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
            return response;
          })
          .catch(() => getFallbackResponse());

        return cached || fetched;
      })
    );
  } else if (EXTERNAL_ASSETS.some((asset) => url.href.startsWith(asset))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        }).catch(() => getFallbackResponse());
      })
    );
  } else {
    event.respondWith(
      fetch(request).catch(() => {
        return getFallbackResponse();
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
