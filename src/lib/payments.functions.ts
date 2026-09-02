import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "node:crypto";

type Provider = "razorpay" | "cashfree";

export const getPaymentConfig = createServerFn({ method: "GET" }).handler(async () => ({
  razorpay: Boolean(process.env["RAZORPAY_KEY_ID"] && process.env["RAZORPAY_KEY_SECRET"]),
  cashfree: Boolean(process.env["CASHFREE_APP_ID"] && process.env["CASHFREE_SECRET_KEY"]),
  razorpayKeyId: process.env["RAZORPAY_KEY_ID"] ?? "",
  cashfreeMode: (process.env["CASHFREE_MODE"] ?? "production") as "sandbox" | "production",
}));

type CreateInput = {
  provider: Provider;
  orderId: string;
  orderNumber: string;
  amount: number;
  name: string;
  email: string;
  phone: string;
  returnUrl: string;
};

const cashfreeBase = () =>
  (process.env["CASHFREE_MODE"] ?? "production") === "sandbox"
    ? "https://sandbox.cashfree.com/pg"
    : "https://api.cashfree.com/pg";

export const createPaymentOrder = createServerFn({ method: "POST" })
  .inputValidator((d: CreateInput) => d)
  .handler(async ({ data }) => {
    const amountPaise = Math.round(data.amount * 100);

    if (data.provider === "razorpay") {
      const keyId = process.env["RAZORPAY_KEY_ID"];
      const keySecret = process.env["RAZORPAY_KEY_SECRET"];
      if (!keyId || !keySecret) throw new Error("Razorpay is not configured yet.");
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: data.orderNumber,
          notes: { order_id: data.orderId },
        }),
      });
      const json = (await res.json()) as { id?: string; error?: { description?: string } };
      if (!res.ok || !json.id) throw new Error(json.error?.description ?? "Razorpay order failed");
      return {
        provider: "razorpay" as const,
        keyId,
        gatewayOrderId: json.id,
        amount: amountPaise,
      };
    }

    const appId = process.env["CASHFREE_APP_ID"];
    const secret = process.env["CASHFREE_SECRET_KEY"];
    if (!appId || !secret) throw new Error("Cashfree is not configured yet.");
    const res = await fetch(`${cashfreeBase()}/orders`, {
      method: "POST",
      headers: {
        "x-client-id": appId,
        "x-client-secret": secret,
        "x-api-version": "2023-08-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_id: data.orderNumber,
        order_amount: Number(data.amount.toFixed(2)),
        order_currency: "INR",
        customer_details: {
          customer_id: data.orderId,
          customer_name: data.name,
          customer_email: data.email,
          customer_phone: data.phone,
        },
        order_meta: { return_url: data.returnUrl },
      }),
    });
    const json = (await res.json()) as { payment_session_id?: string; message?: string };
    if (!res.ok || !json.payment_session_id)
      throw new Error(json.message ?? "Cashfree order failed");
    return {
      provider: "cashfree" as const,
      paymentSessionId: json.payment_session_id,
      gatewayOrderId: data.orderNumber,
    };
  });

type VerifyInput = {
  provider: Provider;
  orderId: string;
  gatewayOrderId: string;
  paymentId?: string;
  signature?: string;
};

export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((d: VerifyInput) => d)
  .handler(async ({ data }) => {
    let paid = false;
    let ref = data.paymentId ?? data.gatewayOrderId;

    if (data.provider === "razorpay") {
      const secret = process.env["RAZORPAY_KEY_SECRET"];
      if (!secret || !data.paymentId || !data.signature) throw new Error("Missing payment proof");
      const expected = createHmac("sha256", secret)
        .update(`${data.gatewayOrderId}|${data.paymentId}`)
        .digest("hex");
      paid = expected === data.signature;
    } else {
      const appId = process.env["CASHFREE_APP_ID"];
      const secret = process.env["CASHFREE_SECRET_KEY"];
      if (!appId || !secret) throw new Error("Cashfree is not configured yet.");
      const res = await fetch(`${cashfreeBase()}/orders/${data.gatewayOrderId}`, {
        headers: {
          "x-client-id": appId,
          "x-client-secret": secret,
          "x-api-version": "2023-08-01",
        },
      });
      const json = (await res.json()) as { order_status?: string; cf_order_id?: string };
      paid = json.order_status === "PAID";
      ref = json.cf_order_id ?? ref;
    }

    if (!paid) return { paid: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "paid", payment_ref: ref })
      .eq("id", data.orderId);

    return { paid: true as const };
  });
