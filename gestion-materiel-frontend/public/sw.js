// Service Worker for GestMat PWA
// Enables: installability, deep linking, basic offline shell, update notifications

const CACHE_NAME = "gestmat-v9";
const SHELL_URLS = ["/e", "/e/fuel", "/login"];

// Install: cache shell pages
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  // Do NOT skipWaiting — let the client control when to activate
});

// Activate: clean old caches, claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Listen for messages from the client
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch: network-first for navigations, network-only for API
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (request.url.includes("/api/") || request.url.includes("/uploads/")) return;

  // Navigation requests: network first, fallback to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/e")))
    );
    return;
  }

  // Static assets: stale-while-revalidate
  if (
    request.url.match(/\.(js|css|png|jpg|svg|woff2?)$/) ||
    request.url.includes("/_next/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
  }
});
