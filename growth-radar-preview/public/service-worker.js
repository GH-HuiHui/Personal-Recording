const CACHE_VERSION = 'growth-radar-shell-v1';
const CORE_ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

function isSameOriginStatic(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return ['document', 'script', 'style', 'image', 'font', 'manifest', 'worker'].includes(request.destination);
}

async function discoverBuiltAssets(cache) {
  const response = await fetch('./index.html', { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw new Error('APP_SHELL_UNAVAILABLE');
  await cache.put('./index.html', response.clone());
  const html = await response.text();
  const paths = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], self.location.href))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => url.href);
  await cache.addAll([...new Set(paths)]);
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(CORE_ASSETS);
    await discoverBuiltAssets(cache);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('growth-radar-') && key !== CACHE_VERSION).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (!isSameOriginStatic(event.request)) return;
  const requestUrl = new URL(event.request.url);
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request);
        if (fresh.ok) (await caches.open(CACHE_VERSION)).put('./index.html', fresh.clone());
        return fresh;
      } catch {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    const fresh = await fetch(event.request);
    if (fresh.ok && requestUrl.origin === self.location.origin) {
      (await caches.open(CACHE_VERSION)).put(event.request, fresh.clone());
    }
    return fresh;
  })());
});
