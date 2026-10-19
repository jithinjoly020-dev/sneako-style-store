import { createServerFn } from "@tanstack/react-start";

const OWNER_EMAIL = "jithinjoly020@gmail.com";

const inr = (n: number) => `Rs ${Math.round(Number(n)).toLocaleString("en-IN")}`;

/**
 * Emails the shop owner a full copy of every order that is placed.
 * Uses Resend when RESEND_API_KEY is present; otherwise it no-ops so
 * checkout never fails because of email.
 */
export const emailOrderToOwner = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) return { sent: false as const, reason: "not_configured" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) return { sent: false as const, reason: "not_found" };

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", data.orderId);

    const o = order as Record<string, unknown>;
    const rows = (items ?? [])
      .map(
        (i) =>
          `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${i.product_name} · ${i.size}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">x${i.quantity}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${inr(Number(i.unit_price) * i.quantity)}</td></tr>`,
      )
      .join("");

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;color:#141414">
        <h2 style="margin:0 0 4px">New order ${String(o["order_number"])}</h2>
        <p style="margin:0 0 18px;color:#5c5c5c">Comfort Hub · ${new Date(String(o["created_at"])).toLocaleString("en-IN")}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
        <table style="width:100%;margin-top:14px;font-size:14px">
          <tr><td>Subtotal</td><td style="text-align:right">${inr(Number(o["subtotal"] ?? o["total"]))}</td></tr>
          <tr><td>Prepaid discount</td><td style="text-align:right">-${inr(Number(o["discount"] ?? 0))}</td></tr>
          <tr><td>Shipping (${String(o["shipping_method"] ?? "standard")})</td><td style="text-align:right">${inr(Number(o["shipping_fee"] ?? 0))}</td></tr>
          <tr><td><b>Total</b></td><td style="text-align:right"><b>${inr(Number(o["total"]))}</b></td></tr>
        </table>
        <h3 style="margin:24px 0 6px">Deliver to</h3>
        <p style="margin:0;font-size:14px;line-height:1.6">
          ${String(o["customer_name"])}<br/>
          ${String(o["address_line"])}, ${String(o["city"])} ${String(o["postal_code"])}, ${String(o["country"])}<br/>
          ${String(o["customer_phone"])} · ${String(o["customer_email"])}
        </p>
        <p style="margin:16px 0 0;font-size:14px">Payment: <b>${String(o["payment_method"])}</b> (${String(o["payment_status"] ?? "pending")})</p>
        ${o["notes"] ? `<p style="margin:10px 0 0;font-size:14px;color:#5c5c5c">Notes: ${String(o["notes"])}</p>` : ""}
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Comfort Hub orders <onboarding@resend.dev>",
        to: [OWNER_EMAIL],
        reply_to: String(o["customer_email"]),
        subject: `New order ${String(o["order_number"])} · ${inr(Number(o["total"]))} · ${String(o["payment_method"])}`,
        html,
      }),
    });

    if (!res.ok) return { sent: false as const, reason: await res.text() };
    return { sent: true as const };
  });
