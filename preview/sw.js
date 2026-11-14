/* The preview copy was retired on Nov 14, 2026. A phone that still has the old preview worker picks this up:
   it takes over open preview pages, deletes the preview's caches, sends those pages to the live app and removes itself.
   It has no fetch handler, so anything still under preview/ comes from the network (a page that redirects to the live app). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    try { await self.clients.claim(); } catch (err) {}
    for (const k of await caches.keys()) if (k.startsWith("pv-")) await caches.delete(k);
    for (const c of await self.clients.matchAll({ type: "window" })) { try { await c.navigate(new URL("../", self.registration.scope).href); } catch (err) {} }
    await self.registration.unregister();
  })());
});
