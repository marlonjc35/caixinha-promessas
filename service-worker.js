const CACHE_NAME = 'caixinha-promessas-v2';
const PRECACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/assets/css/style.css',
  '/assets/js/app.js',
  '/assets/js/database.js',
  '/assets/js/storage.js',
  '/assets/js/history.js',
  '/assets/js/favorites.js',
  '/assets/js/theme.js',
  '/assets/js/search.js',
  '/assets/js/audio.js',
  '/manifest.json',
  '/assets/icons/icon-192.svg',
  '/assets/icons/icon-512.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

function fromNetwork(request, timeout) {
  return new Promise((fulfill, reject) => {
    const timeoutId = setTimeout(reject, timeout);
    fetch(request).then(response => {
      clearTimeout(timeoutId);
      fulfill(response);
    }, reject);
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fromNetwork(request, 5000).catch(() => caches.match(request)).then(response => response || caches.match('/offline.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        event.waitUntil(fetch(request).then(resp => caches.open(CACHE_NAME).then(cache => cache.put(request, resp.clone()))).catch(()=>{}));
        return cached;
      }
      return fetch(request).then(resp => {
        if (request.method === 'GET' && resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return resp;
      }).catch(() => {
        if (request.destination === 'image') return caches.match('/assets/icons/icon-192.svg');
        return caches.match('/offline.html');
      });
    })
  );
});
