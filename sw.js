// Keeps the app shell cached so it opens offline or on a slow connection.
// Exchange-rate requests are not touched; they always go to the network.
const CACHE = "mcc-shell-v2";
const SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-192.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png"
];
const NETWORK_WAIT_MS = 2500;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first so updates show up straight away. If the network is slow or
// down, fall back to the cached copy after a short wait.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  const network = caches.open(CACHE).then((cache) =>
    fetch(e.request).then((res) => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    })
  );
  e.waitUntil(network.catch(() => {}));

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      if (!cached) return network.catch(() => caches.match("./").then((r) => r || Response.error()));
      const fallback = new Promise((resolve) => setTimeout(() => resolve(cached), NETWORK_WAIT_MS));
      return Promise.race([network.catch(() => cached), fallback]);
    })
  );
});
