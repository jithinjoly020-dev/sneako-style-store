import { createServerFn } from "@tanstack/react-start";

/**
 * SMB UPI gateway. Env: SMB_UPI_API_KEY, and the API secret saved as
 * SMB_UPI_API_SECRET (falls back to STRIPE_LIVE_API_KEY, where it was saved).
 * Orders are only marked paid after a server-side check-status call.
 */
const BASE = "https://smbupi.com/api";

function creds() {
  const key = process.env["SMB_UPI_API_KEY"];
  const secret = process.env["SMB_UPI_API_SECRET"] ?? process.env["STRIPE_LIVE_API_KEY"];
  if (!key || !secret) throw new Error("UPI gateway is not configured yet.");
  return { key, secret };
}

async function smbPost(path: string, body: Record<string, unknown>) {
  const { key, secret } = creds();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": key, "X-API-Secret": secret },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: { status?: string; message?: string; data?: Record<string, unknown> } = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    console.error("SMB UPI bad response", text.slice(0, 300));
    throw new Error("Payment gateway returned an unexpected response.");
  }
  if (!res.ok || json.status !== "success") {
    console.error("SMB UPI error", res.status, text.slice(0, 300));
    throw new Error(json.message ?? "Payment gateway request failed.");
  }
  return json.data ?? {};
}

export const smbCreateOrder = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: string; returnUrl: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, total, customer_name, customer_phone, payment_status")
      .eq("id", data.orderId)
      .single();
    if (error || !order) throw new Error("Order not found");
    if (order.payment_status === "paid") throw new Error("This order is already paid.");

    const origin = new URL(data.returnUrl).origin;
    const mobile = (order.customer_phone ?? "").replace(/\D/g, "").slice(-10);
    const res = await smbPost("/create-order", {
      amount: Number(order.total),
      order_id: order.id,
      customer_name: order.customer_name,
      customer_mobile: mobile.length === 10 ? mobile : undefined,
      callback_url: `${origin}/checkout?smb=${order.id}`,
      description: `Comfort Hub order ${order.order_number}`,
    });
    const url = String(res["payment_url"] ?? "");
    if (!url.startsWith("https://smbupi.com/")) throw new Error("Gateway did not return a payment link.");
    return { paymentUrl: url };
  });

export const smbVerifyOrder = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data }) => {
    const { verifySmbOrder } = await import("@/lib/smbupi.server");
    return verifySmbOrder(data.orderId);
  });
