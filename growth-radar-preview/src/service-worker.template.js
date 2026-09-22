const CACHE_VERSION = '__CACHE_VERSION__';
const CORE_ASSETS = __PRECACHE_ASSETS__;
const SCOPE = self.registration.scope;
const CACHE_PREFIX = `growth-radar:${new URL(SCOPE).pathname}:`;
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const INDEX_URL = new URL('./index.html', SCOPE).href;
const ALLOWED_URLS = new Set(CORE_ASSETS.map((path) => new URL(path, SCOPE).href));

function isSameOriginStatic(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return !url.search && ALLOWED_URLS.has(url.href);
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([...ALLOWED_URLS].map((url) => new Request(url, { cache: 'reload' })));
    // A waiting version activates after existing tabs close, avoiding mixed app versions.
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (!isSameOriginStatic(event.request)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const key = event.request.mode === 'navigate' ? INDEX_URL : event.request.url;
    return (await cache.match(key)) || Response.error();
  })());
});
