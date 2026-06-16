/* Service worker — offline support that still picks up updates.
   - The app page (HTML) is network-first: you always get the latest when online,
     and fall back to the cached copy when offline.
   - Everything else is cache-first for speed/offline.
   Bump CACHE whenever you ship a new version to force a clean refresh. */
var CACHE = "screenplay-v2";
var ASSETS = ["screenwriter.html", "manifest.webmanifest"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var isApp = req.mode === "navigate" || /screenwriter\.html(\?|$)/.test(req.url);

  if (isApp) {
    // network-first so a freshly uploaded version is picked up when online
    e.respondWith(
      fetch(req).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { try { c.put("screenwriter.html", copy); } catch (_) {} });
        return resp;
      }).catch(function () {
        return caches.match("screenwriter.html").then(function (h) { return h || caches.match(req); });
      })
    );
    return;
  }

  // everything else: cache-first
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { try { c.put(req, copy); } catch (_) {} });
        return resp;
      });
    })
  );
});
