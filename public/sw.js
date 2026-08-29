self.addEventListener("install", function (event) {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", function (event) {
  event.respondWith(fetch(event.request).catch(function () {
    if (event.request.mode === "navigate") {
      return new Response("オフラインです", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    return new Response("", { status: 504 });
  }));
});
