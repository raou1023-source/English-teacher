export const PWA_MANIFEST = {
  name: "英会話アプリ",
  short_name: "英会話",
  description: "紙の上で、英語を書く。会話、画像の読み取り、AnkiDroid への書き出し。",
  id: "/",
  start_url: "/",
  scope: "/",
  display: "standalone",
  lang: "ja",
  dir: "ltr",
  background_color: "#e4d7c3",
  theme_color: "#e4d7c3",
  prefer_related_applications: false,
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
} as const;

export const SW_SOURCE = `self.addEventListener("install", function (event) {
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
`;
