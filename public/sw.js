const CACHE_NAME = 'whatsapp-red-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.css',
  '/app.js',
  '/component.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
