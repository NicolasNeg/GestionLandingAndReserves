const SW_VERSION = 'v1-mobile-scanner';
const SHELL_CACHE = `shell-${SW_VERSION}`;
const STATIC_CACHE = `static-${SW_VERSION}`;

const APP_SHELL = ['/', '/home', '/login', '/escaner'];

function isSupabaseRequest(url) {
  return url.hostname.includes('supabase.co') || url.pathname.startsWith('/rest/v1') || url.pathname.startsWith('/auth/v1');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;
  if (isSupabaseRequest(url)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('/home').then(async (cachedHome) => {
        try {
          const net = await fetch(req);
          const shell = await caches.open(SHELL_CACHE);
          shell.put('/home', net.clone());
          return net;
        } catch {
          return cachedHome || caches.match('/') || Response.error();
        }
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(async (cached) => {
      if (cached) return cached;
      try {
        const net = await fetch(req);
        if (url.origin === self.location.origin) {
          const staticCache = await caches.open(STATIC_CACHE);
          staticCache.put(req, net.clone());
        }
        return net;
      } catch {
        return cached || Response.error();
      }
    })
  );
});
