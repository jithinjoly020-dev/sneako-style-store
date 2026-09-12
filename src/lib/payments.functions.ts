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

type PaytmIdInput = { orderId: string; paytmOrderId: string };

/**
 * "Already paid?" flow (like the classic add-funds script): the customer
 * paid the merchant directly and pastes the Paytm Order ID. We ask Paytm's
 * status API whether the money really arrived before confirming the order.
 * The Order ID is rejected if it is already used, older than 24 hours, or
 * paid for a smaller amount than the order total.
 */
export const verifyPaytmOrderId = createServerFn({ method: "POST" })
  .inputValidator((d: PaytmIdInput) => {
    const paytmOrderId = d.paytmOrderId.trim();
    if (!paytmOrderId) throw new Error("Enter the Order ID from your Paytm payment");
    return { orderId: d.orderId, paytmOrderId };
  })
  .handler(async ({ data }) => {
    const { paytmCreds, paytmPost } = await import("@/lib/paytm.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { mid } = paytmCreds();

    // This Paytm Order ID can only ever be attached to one order.
    const { data: clash } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("payment_ref", data.paytmOrderId)
      .maybeSingle();
    if (clash) throw new Error("This Order ID has already been used.");

    const json = await paytmPost("/v3/order/status", { mid, orderId: data.paytmOrderId });
    const body = (json.body ?? {}) as {
      resultInfo?: { resultStatus?: string; resultMsg?: string };
      txnDate?: string;
      txnAmount?: string;
      txnId?: string;
    };

    const status = (body.resultInfo?.resultStatus ?? "").toUpperCase();
    if (status === "TXN_FAILURE") {
      throw new Error(body.resultInfo?.resultMsg ?? "That payment failed on Paytm.");
    }
    if (status !== "TXN_SUCCESS") {
      throw new Error("We could not find a completed payment for that Order ID yet.");
    }

    if (body.txnDate) {
      const hours = (Date.now() - new Date(body.txnDate).getTime()) / 3_600_000;
      if (hours > 24) throw new Error("That transaction is older than 24 hours.");
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("total")
      .eq("id", data.orderId)
      .single();
    const paidAmount = Number(body.txnAmount ?? 0);
    if (order && paidAmount + 0.01 < Number(order.total)) {
      throw new Error(
        `That payment was for ₹${paidAmount.toFixed(2)} but this order needs ₹${Number(order.total).toFixed(2)}.`,
      );
    }

    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "paid", status: "confirmed", payment_ref: data.paytmOrderId })
      .eq("id", data.orderId);

    return { ok: true as const, txnId: body.txnId ?? data.paytmOrderId };
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
