import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "node:crypto";

/**
 * BharatPe payment gateway.
 *
 * Env:
 *  - BHARATPE_MERCHANT_ID   merchant id from the BharatPe dashboard
 *  - BHARATPE_API_KEY       api key / client id
 *  - BHARATPE_SECRET        secret used to sign requests
 *  - BHARATPE_MODE          "staging" | "production" (default production)
 *  - BHARATPE_BASE_URL      optional override of the API base url
 */

const isStaging = () => (process.env["BHARATPE_MODE"] ?? "production") === "staging";

const baseUrl = () =>
  process.env["BHARATPE_BASE_URL"] ??
  (isStaging() ? "https://api-staging.bharatpe.in" : "https://api.bharatpe.in");

function creds() {
  const merchantId = process.env["BHARATPE_MERCHANT_ID"];
  const apiKey = process.env["BHARATPE_API_KEY"];
  const secret = process.env["BHARATPE_SECRET"];
  if (!merchantId || !apiKey || !secret) throw new Error("BharatPe is not configured yet.");
  return { merchantId, apiKey, secret };
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

async function callBharatPe(path: string, method: "GET" | "POST", body?: unknown) {
  const { apiKey, secret } = creds();
  const payload = body ? JSON.stringify(body) : "";
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
      "X-SIGNATURE": sign(payload || path, secret),
    },
    ...(body ? { body: payload } : {}),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { message: text };
  }
  if (!res.ok) {
    throw new Error(`BharatPe request failed [${res.status}]: ${text.slice(0, 400)}`);
  }
  return json;
}

export const getPaymentConfig = createServerFn({ method: "GET" }).handler(async () => ({
  bharatpe: Boolean(
    process.env["BHARATPE_MERCHANT_ID"] &&
      process.env["BHARATPE_API_KEY"] &&
      process.env["BHARATPE_SECRET"],
  ),
}));

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
    const { merchantId } = creds();

    const json = (await callBharatPe("/payment-gateway/v1/orders", "POST", {
      merchantId,
      orderId: data.orderNumber,
      amount: Math.round(data.amount * 100), // paise
      currency: "INR",
      returnUrl: data.returnUrl,
      customer: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        referenceId: data.orderId,
      },
    })) as {
      data?: { paymentUrl?: string; paymentLink?: string; orderId?: string };
      paymentUrl?: string;
      message?: string;
    };

    const paymentUrl = json.data?.paymentUrl ?? json.data?.paymentLink ?? json.paymentUrl;
    if (!paymentUrl) throw new Error(json.message ?? "BharatPe order could not be created");

    return {
      provider: "bharatpe" as const,
      gatewayOrderId: json.data?.orderId ?? data.orderNumber,
      paymentUrl,
    };
  });

type VerifyInput = { orderId: string; gatewayOrderId: string };

/**
 * Auto-verifies the payment against BharatPe's order status API and writes the
 * transaction id onto the order once it is settled.
 */
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((d: VerifyInput) => d)
  .handler(async ({ data }) => {
    const json = (await callBharatPe(
      `/payment-gateway/v1/orders/${encodeURIComponent(data.gatewayOrderId)}`,
      "GET",
    )) as {
      data?: { status?: string; transactionId?: string; txnId?: string; message?: string };
      status?: string;
    };

    const status = (json.data?.status ?? json.status ?? "").toUpperCase();
    const txnId = json.data?.transactionId ?? json.data?.txnId ?? data.gatewayOrderId;

    if (!["SUCCESS", "PAID", "COMPLETED", "TXN_SUCCESS"].includes(status)) {
      return { paid: false as const, reason: json.data?.message ?? `Payment ${status || "pending"}` };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "paid", payment_ref: txnId })
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
    const reference = d.reference.trim().toUpperCase();
    if (reference.length < 8) throw new Error("Enter the 12-digit UPI reference / UTR number");
    return { orderId: d.orderId, reference };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: "awaiting_verification", payment_ref: data.reference })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true as const, reference: data.reference };
  });
