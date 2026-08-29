import { createFileRoute } from "@tanstack/react-router";
import { SW_SOURCE } from "@/lib/pwa-assets";

export const Route = createFileRoute("/sw.js")({
  server: {
    handlers: {
      GET: () =>
        new Response(SW_SOURCE, {
          headers: {
            "content-type": "text/javascript; charset=utf-8",
            "cache-control": "no-cache",
            "service-worker-allowed": "/",
          },
        }),
    },
  },
});
