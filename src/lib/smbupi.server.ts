/** Server-only SMB UPI verification shared by the checkout return and webhook. */
export async function verifySmbOrder(orderId: string) {
  const key = process.env["SMB_UPI_API_KEY"];
  const secret = process.env["SMB_UPI_API_SECRET"] ?? process.env["STRIPE_LIVE_API_KEY"];
  if (!key || !secret) throw new Error("UPI gateway is not configured yet.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, total, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) throw new Error("Order not found");
  if (order.payment_status === "paid") {
    return { status: "success" as const, number: order.order_number };
  }

  const res = await fetch("https://smbupi.com/api/check-status", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": key, "X-API-Secret": secret },
    body: JSON.stringify({ order_id: orderId }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: { status?: string; payment_status?: string; amount?: number | string; utr?: string | null };
  };
  // The live API reports the result as `payment_status` (docs say `status`).
  const status = String(json.data?.payment_status ?? json.data?.status ?? "pending").toLowerCase();

  if (status === "success" || status === "paid" || status === "completed") {
    const paid = Number(json.data?.amount ?? 0);
    if (paid + 0.01 < Number(order.total)) {
      return { status: "failed" as const, number: order.order_number };
    }
    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "paid",
        status: "confirmed",
        payment_ref: json.data?.utr || orderId,
      })
      .eq("id", orderId);
    return { status: "success" as const, number: order.order_number };
  }
  return {
    status: (status === "failed" ? "failed" : "pending") as "failed" | "pending",
    number: order.order_number,
  };
}
