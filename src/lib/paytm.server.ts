import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Paytm Payment Gateway (All-in-One / JS Checkout) helpers.
 *
 * Env:
 *  - PAYTM_MID             merchant id from the Paytm business dashboard
 *  - PAYTM_MERCHANT_KEY    merchant key (AES salt) for the same MID
 *  - PAYTM_MODE            "production" (default) | "staging"
 *  - PAYTM_WEBSITE         optional; defaults to DEFAULT / WEBSTAGING
 */

const IV = "@@@@&&&&####$$$$";

export const paytmStaging = () => (process.env["PAYTM_MODE"] ?? "production") === "staging";

export const paytmHost = () =>
  paytmStaging() ? "https://securegw-stage.paytm.in" : "https://securegw.paytm.in";

export const paytmWebsite = () =>
  process.env["PAYTM_WEBSITE"] ?? (paytmStaging() ? "WEBSTAGING" : "DEFAULT");

export function paytmConfigured() {
  return Boolean(process.env["PAYTM_MID"] && process.env["PAYTM_MERCHANT_KEY"]);
}

export function paytmCreds() {
  const mid = process.env["PAYTM_MID"];
  const key = process.env["PAYTM_MERCHANT_KEY"];
  if (!mid || !key) throw new Error("Paytm is not configured yet.");
  return { mid, key };
}

function encrypt(plain: string, key: string) {
  const cipher = createCipheriv("aes-128-cbc", key, IV);
  return Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]).toString("base64");
}

function decrypt(encoded: string, key: string) {
  const decipher = createDecipheriv("aes-128-cbc", key, IV);
  return Buffer.concat([decipher.update(Buffer.from(encoded, "base64")), decipher.final()]).toString(
    "utf8",
  );
}

/** Paytm checksum: AES(SHA256(body|salt) + salt). */
export function paytmSignature(body: unknown, key: string) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  const salt = randomBytes(2).toString("hex"); // 4 chars
  const hash = createHash("sha256").update(`${payload}|${salt}`).digest("hex");
  return encrypt(hash + salt, key);
}

export function paytmVerifySignature(body: unknown, signature: string, key: string) {
  try {
    const payload = typeof body === "string" ? body : JSON.stringify(body);
    const decrypted = decrypt(signature, key);
    const salt = decrypted.slice(-4);
    const expected = createHash("sha256").update(`${payload}|${salt}`).digest("hex") + salt;
    return expected === decrypted;
  } catch {
    return false;
  }
}

export async function paytmPost(path: string, body: Record<string, unknown>) {
  const { key } = paytmCreds();
  const signature = paytmSignature(body, key);
  const res = await fetch(`${paytmHost()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, head: { signature } }),
  });
  const text = await res.text();
  let json: { body?: Record<string, unknown>; head?: Record<string, unknown> } = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Paytm returned an unexpected response: ${text.slice(0, 300)}`);
  }
  if (!res.ok) throw new Error(`Paytm request failed [${res.status}]: ${text.slice(0, 300)}`);
  return json;
}
