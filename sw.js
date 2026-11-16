/* Pocket Budget service worker: opens offline, picks up updates when online. */
const VERSION = "pb-2026-11-15i";
const SHELL = ["./", "./index.html", "./platform.js", "./config.js", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./hanken-grotesk.woff2"];
const CDN = /^https:\/\/(www\.gstatic\.com\/firebasejs|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
// Every cache except the long-lived library cache belongs to one release and is deleted when a newer one activates.
// That also clears the old preview copy's caches ("pv-…").
const CACHE = VERSION;
const mine = k => k !== VENDOR;
// Map and receipt-scan libraries (vendor/): their folder names carry the version, so a URL never changes.
// They live in one long-lived cache, kept across app updates, filled on first use.
const VENDOR = "pb-vendor";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => mine(k) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // old links to the retired preview copy: let the network answer (preview/index.html sends them to the live app)
  if (url.origin === location.origin && url.pathname.includes("/preview/")) return;
  if (url.origin === location.origin && url.pathname.includes("/vendor/")) {
    e.respondWith(caches.open(VENDOR).then(c => c.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
      if (r.ok && r.status === 200) c.put(req, r.clone());
      return r;
    }))));
    return;
  }
  // app files: open instantly from the phone's copy, refresh that copy in the background.
  // A new release arrives as a new sw.js (VERSION bump); the page then shows "Update ready".
  if (url.origin === location.origin) {
    const key = req.mode === "navigate" ? "./index.html" : req;
    const net = fetch(req, { cache: "no-cache" }).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
      return r;
    });
    e.waitUntil(net.then(() => {}, () => {}));
    e.respondWith(caches.open(CACHE).then(c => c.match(key, { ignoreSearch: req.mode === "navigate" })).then(hit => {
      if (hit) return hit;
      return net.catch(() => caches.open(CACHE).then(c => c.match("./index.html")));
    }));
    return;
  }
  // Firebase SDK and fonts: cached copy first, refresh in the background
  if (CDN.test(req.url)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
  // everything else (your database, the sheet script) goes straight to the network
});

// tapping a notification opens (or brings back) the app
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { if ("focus" in c) return c.focus(); }
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || "./");
  }));
});
