/* ============================================================
   Service worker — caches every asset so the game runs fully
   offline after first load and is installable to a home screen.
   Strategy: cache-first for app shell; bump CACHE to ship updates.
   ============================================================ */

const CACHE = "imposter-v8";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/data.js",
  "./js/sound.js",
  "./js/app.js",
  "./js/game.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Stale-while-revalidate: serve the cached copy instantly (stays fully
  // offline + fast), but always re-fetch in the background so the next
  // load picks up any updated assets. No backend is ever contacted —
  // only the app's own static files.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && new URL(req.url).origin === self.location.origin) {
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => null);

      // cached first (fast/offline); otherwise wait on the network,
      // and fall back to the app shell for offline navigations.
      return cached || (await network) ||
        (req.mode === "navigate" ? cache.match("./index.html") : Response.error());
    })
  );
});
