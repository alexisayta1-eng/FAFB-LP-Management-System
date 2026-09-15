// Service Worker for FAFB LP Church Management System
const CACHE_NAME = 'fafb-pwa-cache-v14';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './supabase_config.js',
  './manifest.json',
  './logo.png',
  './style.css',
  './app.js',
  './db.js',
  './login.js',
  './utils.js',
  './dashboard.js',
  './members.js',
  './organizations.js',
  './ministries.js',
  './pledges.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(() => {
      // Ignore cache failures during initial install
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Do not cache API PHP requests (they need live MySQL responses)
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
