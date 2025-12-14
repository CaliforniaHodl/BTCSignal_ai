// Service Worker for BTCSignal.ai PWA
// Version management for cache busting
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `btcsignal-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `btcsignal-dynamic-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/src/css/bootstrap/bootstrap.min.css',
  '/src/css/shared.css',
  '/src/js/access-manager.js',
  '/src/js/error-tracker.js',
  '/src/js/toast.js',
  '/src/js/site.js',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing service worker...', event);

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Precaching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('[Service Worker] Failed to cache static assets:', error);
      })
  );

  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating service worker...', event);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Remove old caches that don't match current version
              return cacheName.startsWith('btcsignal-') &&
                     cacheName !== STATIC_CACHE &&
                     cacheName !== DYNAMIC_CACHE;
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
  );

  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API calls - Network-first strategy
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/data/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets - Cache-first strategy
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML pages - Network-first with offline fallback
  if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  // Default - try network, fallback to cache
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// Cache-first strategy (for static assets)
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    console.log('[Service Worker] Serving from cache:', request.url);
    return cached;
  }

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response && response.status === 200) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }

    return response;
  } catch (error) {
    console.error('[Service Worker] Fetch failed for:', request.url, error);
    throw error;
  }
}

// Network-first strategy (for API calls and dynamic content)
async function networkFirst(request) {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response && response.status === 200) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }

    return response;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    throw error;
  }
}

// Network-first with offline fallback (for HTML pages)
async function networkFirstWithOffline(request) {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response && response.status === 200) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }

    return response;
  } catch (error) {
    console.log('[Service Worker] Network failed for navigation:', request.url);

    // Try cache first
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    // Fallback to offline page
    const offlinePage = await cache.match(OFFLINE_PAGE);
    if (offlinePage) {
      return offlinePage;
    }

    // Last resort - return basic offline message
    return new Response(
      `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - BTC Signals Pro</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #0d1117;
            color: #c9d1d9;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
          }
          .container {
            max-width: 400px;
          }
          h1 {
            color: #f7931a;
            margin-bottom: 1rem;
          }
          p {
            margin-bottom: 1.5rem;
            line-height: 1.6;
          }
          button {
            background-color: #f7931a;
            color: #0d1117;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
          }
          button:hover {
            background-color: #ff9f1a;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>You're Offline</h1>
          <p>It looks like you've lost your internet connection. Please check your connection and try again.</p>
          <button onclick="window.location.reload()">Retry</button>
        </div>
      </body>
      </html>
      `,
      {
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'Content-Type': 'text/html; charset=utf-8',
        }),
      }
    );
  }
}

// Background sync for failed requests (optional enhancement)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Implement background sync logic here
      Promise.resolve()
    );
  }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});
