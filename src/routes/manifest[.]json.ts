import { createFileRoute } from "@tanstack/react-router";
import { PWA_MANIFEST } from "@/lib/pwa-assets";

export const Route = createFileRoute("/manifest.json")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify(PWA_MANIFEST), {
          headers: {
            "content-type": "application/manifest+json; charset=utf-8",
            "cache-control": "no-cache",
          },
        }),
    },
  },
});
