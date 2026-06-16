/* Service worker — makes the app work fully offline once it has been opened once.
   Cache-first for the app shell; falls back to the app page for navigations. */
var CACHE = "screenplay-v1";
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
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (resp) {
        return caches.open(CACHE).then(function (c) {
          try { c.put(e.request, resp.clone()); } catch (_) {}
          return resp;
        });
      }).catch(function () {
        if (e.request.mode === "navigate") return caches.match("screenwriter.html");
      });
    })
  );
});
