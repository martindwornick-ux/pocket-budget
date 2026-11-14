/* Pocket Budget service worker: opens offline, picks up updates when online. */
const VERSION = "pb-2026-11-14d";
const SHELL = ["./", "./index.html", "./platform.js", "./config.js", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./hanken-grotesk.woff2"];
const CDN = /^https:\/\/(www\.gstatic\.com\/firebasejs|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // app files: open instantly from the phone's copy, refresh that copy in the background.
  // A new release arrives as a new sw.js (VERSION bump); the page then shows "Update ready".
  if (url.origin === location.origin) {
    const key = req.mode === "navigate" ? "./index.html" : req;
    const net = fetch(req, { cache: "no-cache" }).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(key, copy)); }
      return r;
    });
    e.waitUntil(net.then(() => {}, () => {}));
    e.respondWith(caches.open(VERSION).then(c => c.match(key, { ignoreSearch: req.mode === "navigate" })).then(hit => {
      if (hit) return hit;
      return net.catch(() => caches.match("./index.html"));
    }));
    return;
  }
  // Firebase SDK and fonts: cached copy first, refresh in the background
  if (CDN.test(req.url)) {
    e.respondWith(caches.open(VERSION).then(c => c.match(req).then(hit => {
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
