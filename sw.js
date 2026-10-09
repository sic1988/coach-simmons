/* ============================================================
   Coach Simmons — Service Worker (PWA)
   Versione: v3bis-1
   IMPORTANTE: incrementa CACHE_VERSION ad ogni aggiornamento dell'app!
   ============================================================ */

const CACHE_VERSION = 'v3bis-2';
const CACHE_NAME = `coach-simmons-${CACHE_VERSION}`;

// File che vengono messi in cache al primo caricamento
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Installazione: mette in cache i file di base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('[SW] Precache parziale:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Attivazione: elimina le cache vecchie
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key.startsWith('coach-simmons-') && key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: strategia Network-First per l'HTML, Cache-First per il resto
self.addEventListener('fetch', event => {
  const req = event.request;

  // Non intercettare richieste non-GET o verso altri domini (Intervals, Gemini)
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML: prima rete, fallback cache
  if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Altri file (CSS, JS, icone): prima cache, poi rete
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return res;
      });
    })
  );
});

// Messaggio dal main thread: forza aggiornamento
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
