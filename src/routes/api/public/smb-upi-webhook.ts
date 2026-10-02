import { createFileRoute } from "@tanstack/react-router";

async function hmacHex(body: string, secret: string) {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** SMB UPI webhook: signature-checked, then re-verified via check-status before marking paid. */
export const Route = createFileRoute("/api/public/smb-upi-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SMB_UPI_API_SECRET"] ?? process.env["STRIPE_LIVE_API_KEY"];
        if (!secret) return new Response("Not configured", { status: 503 });
        const raw = await request.text();
        const given = (request.headers.get("X-PayIndia-Signature") ?? "").toLowerCase();
        if (!safeEqual(given, await hmacHex(raw, secret))) {
          return new Response("Bad signature", { status: 401 });
        }
        let payload: { event?: string; data?: { order_id?: string }; order_id?: string } = {};
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }
        const orderId = payload.data?.order_id ?? payload.order_id;
        if (payload.event === "payment.success" && orderId && /^[0-9a-f-]{36}$/i.test(orderId)) {
          const { verifySmbOrder } = await import("@/lib/smbupi.server");
          await verifySmbOrder(orderId).catch((e) => console.error("SMB webhook verify", e));
        }
        return Response.json({ ok: true });
      },
    },
  },
});
