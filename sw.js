/* Service worker: aplikacja ma działać w metrze i w samolocie.
   Strategia: cache-first dla powłoki aplikacji, sieć dla API Azure. */

const CACHE = 'slowka-v4';
const NET_TIMEOUT = 3000;   // po tylu ms uznajemy sieć za zbyt wolną
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/app.js',
  './js/config.js',
  './js/util.js',
  './js/db.js',
  './js/fsrs.js',
  './js/session.js',
  './js/gestures.js',
  './js/ai.js',
  './js/views.js',
  './js/sync.js',
  './js/seed.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API nigdy nie trafia do cache — dane muszą być świeże
  if (url.pathname.includes('/api/')) {
    e.respondWith(fetch(e.request).catch(() => new Response('[]', {
      headers: { 'Content-Type': 'application/json' }
    })));
    return;
  }

  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // Sieć najpierw (żeby po wgraniu poprawek telefon widział nową wersję),
  // cache jako zapas przy braku zasięgu albo wolnym łączu.
  e.respondWith((async () => {
    const cached = caches.match(e.request);
    try {
      const res = await Promise.race([
        fetch(e.request),
        new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), NET_TIMEOUT))
      ]);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }
      return (await cached) || res;
    } catch {
      return (await cached) || Response.error();
    }
  })());
});
