export const UPI_ID = "8590233909@upi";
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
