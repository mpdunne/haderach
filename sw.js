const CACHE = 'haderach-v3-2-2';
const ASSETS = [
  './',
  './index.html',
  './app.js?v=3.2.2',
  './themes.css?v=3.2.2',
  './style.css?v=3.2.2',
  './question-sets/naturalisation-francaise-2026.json?v=3.2.0',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/avatars/memphis.png',
  './assets/avatars/cyber.png',
  './assets/avatars/win95.png',
  './assets/avatars/acid.png',
  './assets/avatars/paper.png',
  './assets/avatars/y2k.png',
  './assets/avatars/riso.png',
  './assets/avatars/gameboy.png',
  './assets/avatars/sunset.png',
  './assets/avatars/botanical.png',
  './assets/avatars/spaceage.png',
];
// Cache the complete app before activating an update.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Prefer current files online; fall back to the saved copy offline.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
