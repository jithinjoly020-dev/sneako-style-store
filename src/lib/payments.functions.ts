import { createServerFn } from "@tanstack/react-start";

/**
 * Paytm Payment Gateway (All-in-One).
 *
 * Env: PAYTM_MID, PAYTM_MERCHANT_KEY, PAYTM_MODE ("production" | "staging").
 * Payments are auto-verified server-side against Paytm's order status API
 * before an order is ever marked paid.
 */

export const getPaymentConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { paytmConfigured } = await import("@/lib/paytm.server");
  return { paytm: paytmConfigured() };
});

type CreateInput = {
  orderId: string;
  orderNumber: string;
  amount: number;
  name: string;
  email: string;
  phone: string;
  returnUrl: string;
};

export const createPaymentOrder = createServerFn({ method: "POST" })
  .inputValidator((d: CreateInput) => d)
  .handler(async ({ data }) => {
    const { paytmCreds, paytmPost, paytmWebsite } = await import("@/lib/paytm.server");
    const { mid } = paytmCreds();
    const origin = new URL(data.returnUrl).origin;

    const json = await paytmPost(
      `/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(
        data.orderNumber,
      )}`,
      {
        requestType: "Payment",
        mid,
        websiteName: paytmWebsite(),
        orderId: data.orderNumber,
        callbackUrl: `${origin}/api/public/paytm-callback`,
        txnAmount: { value: data.amount.toFixed(2), currency: "INR" },
        userInfo: {
          custId: data.orderId,
          email: data.email,
          mobile: data.phone,
          firstName: data.name,
        },
      },
    );

    const body = (json.body ?? {}) as {
      txnToken?: string;
      resultInfo?: { resultMsg?: string; resultStatus?: string };
    };
    if (!body.txnToken) {
      throw new Error(body.resultInfo?.resultMsg ?? "Paytm could not start this payment.");
    }

    return {
      provider: "paytm" as const,
      gatewayOrderId: data.orderNumber,
      paymentUrl: `/api/public/paytm-redirect?orderId=${encodeURIComponent(
        data.orderNumber,
      )}&token=${encodeURIComponent(body.txnToken)}`,
    };
  });

type VerifyInput = { orderId: string; gatewayOrderId: string };

/**
 * Auto-verifies against Paytm's order status API and writes the Paytm
 * transaction id onto the order once the money is actually captured.
 */
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((d: VerifyInput) => d)
  .handler(async ({ data }) => {
    const { paytmCreds, paytmPost } = await import("@/lib/paytm.server");
    const { mid } = paytmCreds();

    const json = await paytmPost("/v3/order/status", { mid, orderId: data.gatewayOrderId });
    const body = (json.body ?? {}) as {
      resultInfo?: { resultStatus?: string; resultMsg?: string };
      txnId?: string;
      txnAmount?: string;
    };

    const status = (body.resultInfo?.resultStatus ?? "").toUpperCase();
    if (status !== "TXN_SUCCESS") {
      return {
        paid: false as const,
        reason: body.resultInfo?.resultMsg ?? `Payment ${status || "pending"}`,
      };
    }

    const txnId = body.txnId ?? data.gatewayOrderId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "paid", status: "confirmed", payment_ref: txnId })
      .eq("id", data.orderId);

    return { paid: true as const, txnId };
  });

type UpiInput = { orderId: string; reference: string };

/**
 * Direct UPI: the customer pays to the studio VPA and submits the UPI
 * transaction reference (UTR). It is stored on the order for reconciliation.
 */
export const submitUpiReference = createServerFn({ method: "POST" })
  .inputValidator((d: UpiInput) => {
    const reference = d.reference.trim().toUpperCase().replace(/\s+/g, "");
    if (!/^\d{12}$/.test(reference)) {
      throw new Error("Enter the 12-digit UPI reference / UTR number from your payment app");
    }
    return { orderId: d.orderId, reference };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // A reference can only ever belong to one payment — reject reuse.
    const { data: clash } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("payment_ref", data.reference)
      .neq("id", data.orderId)
      .maybeSingle();
    if (clash) {
      throw new Error("That UPI reference is already used on another order.");
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: "awaiting_verification", payment_ref: data.reference })
      .eq("id", data.orderId)
      .select("total")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, reference: data.reference, amount: Number(order.total) };
  });

type PaidStatusInput = { orderId: string };

/** Lets the checkout screen poll until the studio confirms the money landed. */
export const getPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((d: PaidStatusInput) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    const status = order?.payment_status ?? "pending";
    return { status, paid: status === "paid", rejected: status === "payment_failed" };
  });
