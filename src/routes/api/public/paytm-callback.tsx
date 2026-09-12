import { createFileRoute } from "@tanstack/react-router";

const page = `<!doctype html><html><head><meta charset="utf-8"><title>Payment complete</title>
<style>body{background:#0b0b0b;color:#eee;font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;text-align:center}</style>
</head><body><div><p>Payment finished. You can close this window.</p></div>
<script>setTimeout(function(){window.close()},1500)</script></body></html>`;

/** Paytm posts the customer back here after the payment page. Status is verified server-side. */
export const Route = createFileRoute("/api/public/paytm-callback")({
  server: {
    handlers: {
      GET: async () =>
        new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
      POST: async () =>
        new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    },
  },
});
