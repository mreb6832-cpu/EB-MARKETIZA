
const CACHE_NAME = "eb-marketiza-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();

      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith("/sw.js")) return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);

      if (cached) return cached;

      if (event.request.mode === "navigate") {
        return (
          await caches.match("./index.html")
        ) || Response.error();
      }

      return Response.error();
    })
  );
});
