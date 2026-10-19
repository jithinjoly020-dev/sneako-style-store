import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Fallback used only if no UPI account is configured in the admin site. */
export const UPI_ID = "8590233909@upi";
export const UPI_NAME = "Comfort Hub";

export type UpiAccount = {
  id: string;
  label: string;
  upi_id: string;
  payee_name: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
};

export const upiAccountsQuery = queryOptions({
  queryKey: ["upi-accounts"],
  queryFn: async (): Promise<UpiAccount[]> => {
    const { data, error } = await supabase
      .from("upi_accounts")
      .select("id, label, upi_id, payee_name, is_active, is_default, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

/** Builds a standard UPI intent link that opens GPay / PhonePe / Paytm / any UPI app. */
export function upiLink(amount: number, note: string, upiId = UPI_ID, payeeName = UPI_NAME) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}
