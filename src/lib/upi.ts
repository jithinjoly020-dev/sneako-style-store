/**
 * Direct UPI payments — no gateway or merchant account needed.
 * Change UPI_ID / UPI_NAME to your own VPA and it goes live instantly.
 */
export const UPI_ID = "unlabelled@upi";
export const UPI_NAME = "unlabelled";

/** Builds a standard UPI intent link that opens GPay / PhonePe / Paytm / any UPI app. */
export function upiLink(amount: number, note: string) {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: UPI_NAME,
    am: amount.toFixed(2),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}
