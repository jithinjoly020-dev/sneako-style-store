import { createServerFn } from "@tanstack/react-start";
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** Paytm PG (merchant MID + merchant key) */

const IV = "@@@@&&&&####$$$$";

function aesEncrypt(value: string, key: string) {
  const c = createCipheriv("aes-128-cbc", key.slice(0, 16), IV);
  return c.update(value, "utf8", "base64") + c.final("base64");
}

function aesDecrypt(value: string, key: string) {
  const d = createDecipheriv("aes-128-cbc", key.slice(0, 16), IV);
  return d.update(value, "base64", "utf8") + d.final("utf8");
}

/** Paytm checksum (signature) for a JSON body. */
function generateSignature(body: unknown, key: string) {
  const salt = randomBytes(2).toString("hex"); // 4 chars
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  const hash = createHash("sha256").update(`${payload}|${salt}`).digest("hex");
  return aesEncrypt(`${hash}${salt}`, key);
}

function verifySignature(body: unknown, key: string, signature: string) {
  try {
    const decoded = aesDecrypt(signature, key);
    const salt = decoded.slice(-4);
    const payload = typeof body === "string" ? body : JSON.stringify(body);
    const hash = createHash("sha256").update(`${payload}|${salt}`).digest("hex");
    return `${hash}${salt}` === decoded;
  } catch {
    return false;
  }
}

const isStaging = () => (process.env["PAYTM_MODE"] ?? "production") === "staging";
const paytmHost = () => (isStaging() ? "https://securegw-stage.paytm.in" : "https://securegw.paytm.in");
const paytmWebsite = () => process.env["PAYTM_WEBSITE"] ?? (isStaging() ? "WEBSTAGING" : "DEFAULT");

export const getPaymentConfig = createServerFn({ method: "GET" }).handler(async () => ({
  paytm: Boolean(process.env["PAYTM_MID"] && process.env["PAYTM_MERCHANT_KEY"]),
  paytmMid: process.env["PAYTM_MID"] ?? "",
  paytmHost: paytmHost(),
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
    const mid = process.env["PAYTM_MID"];
    const key = process.env["PAYTM_MERCHANT_KEY"];
    if (!mid || !key) throw new Error("Paytm is not configured yet.");

    const body = {
      requestType: "Payment",
      mid,
      websiteName: paytmWebsite(),
      orderId: data.orderNumber,
      callbackUrl: data.returnUrl,
      txnAmount: { value: data.amount.toFixed(2), currency: "INR" },
      userInfo: {
        custId: data.orderId,
        email: data.email,
        mobile: data.phone,
        firstName: data.name,
      },
    };

    const res = await fetch(
      `${paytmHost()}/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${encodeURIComponent(data.orderNumber)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, head: { signature: generateSignature(body, key) } }),
      },
    );
    const json = (await res.json()) as {
      body?: { txnToken?: string; resultInfo?: { resultMsg?: string } };
    };
    const txnToken = json.body?.txnToken;
    if (!txnToken) throw new Error(json.body?.resultInfo?.resultMsg ?? "Paytm order failed");

    return {
      provider: "paytm" as const,
      mid,
      host: paytmHost(),
      gatewayOrderId: data.orderNumber,
      txnToken,
      amount: data.amount.toFixed(2),
    };
  });

type VerifyInput = { orderId: string; gatewayOrderId: string };

/**
 * Auto-verifies a payment straight with Paytm's transaction status API and
 * writes the transaction id back to the order when it is settled.
 */
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((d: VerifyInput) => d)
  .handler(async ({ data }) => {
    const mid = process.env["PAYTM_MID"];
    const key = process.env["PAYTM_MERCHANT_KEY"];
    if (!mid || !key) throw new Error("Paytm is not configured yet.");

    const body = { mid, orderId: data.gatewayOrderId };
    const res = await fetch(`${paytmHost()}/v3/order/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, head: { signature: generateSignature(body, key) } }),
    });
    const json = (await res.json()) as {
      head?: { signature?: string };
      body?: {
        resultInfo?: { resultStatus?: string; resultMsg?: string };
        txnId?: string;
        txnAmount?: string;
      };
    };

    const signature = json.head?.signature;
    if (signature && json.body && !verifySignature(json.body, key, signature)) {
      return { paid: false as const, reason: "Signature mismatch" };
    }

    const status = json.body?.resultInfo?.resultStatus;
    const txnId = json.body?.txnId ?? data.gatewayOrderId;
    if (status !== "TXN_SUCCESS") {
      return { paid: false as const, reason: json.body?.resultInfo?.resultMsg ?? "Not paid yet" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "paid", payment_ref: txnId })
      .eq("id", data.orderId);

    return { paid: true as const, txnId };
  });
