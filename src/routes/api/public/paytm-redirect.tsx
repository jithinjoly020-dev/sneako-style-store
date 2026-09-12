import { createFileRoute } from "@tanstack/react-router";

/**
 * Paytm's hosted payment page must be reached with an HTTP POST carrying the
 * txnToken. The browser can only open a URL, so this route returns a tiny
 * auto-submitting form that performs the POST.
 */
export const Route = createFileRoute("/api/public/paytm-redirect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const orderId = url.searchParams.get("orderId") ?? "";
        const token = url.searchParams.get("token") ?? "";
        if (!orderId || !token) return new Response("Missing parameters", { status: 400 });

        const { paytmCreds, paytmHost } = await import("@/lib/paytm.server");
        const { mid } = paytmCreds();
        const escape = (s: string) => s.replace(/[<>"'&]/g, "");
        const action = `${paytmHost()}/theia/api/v1/showPaymentPage?mid=${encodeURIComponent(
          mid,
        )}&orderId=${encodeURIComponent(orderId)}`;

        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Redirecting to Paytm…</title>
<style>body{background:#0b0b0b;color:#eee;font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0}</style>
</head><body><p>Opening secure Paytm payment…</p>
<form id="f" method="post" action="${action}">
<input type="hidden" name="mid" value="${escape(mid)}">
<input type="hidden" name="orderId" value="${escape(orderId)}">
<input type="hidden" name="txnToken" value="${escape(token)}">
</form><script>document.getElementById('f').submit();</script></body></html>`;

        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
