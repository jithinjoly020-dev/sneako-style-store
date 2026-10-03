import { supabase } from "@/integrations/supabase/client";

export type CustomSettings = {
  id: number;
  enabled: boolean;
  base_price: number;
  front_print_price: number;
  back_print_price: number;
  colors: string[];
  sizes: string[];
  notes: string;
};

export const customSettingsQuery = {
  queryKey: ["custom-settings"],
  queryFn: async (): Promise<CustomSettings | null> => {
    const { data, error } = await supabase.from("custom_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data as CustomSettings | null;
  },
};

export const CUSTOM_STATUSES = [
  "new",
  "reviewing",
  "quoted",
  "approved",
  "printing",
  "shipped",
  "delivered",
  "rejected",
] as const;

export const inr = (n: number) => `₹${Math.round(Number(n)).toLocaleString("en-IN")}`;

const swatches: Record<string, string> = {
  black: "#141414",
  white: "#f2f2f0",
  grey: "#8a8a88",
  gray: "#8a8a88",
  navy: "#1d2a44",
  olive: "#5b5e3c",
  red: "#9e2a2b",
  blue: "#2f5d9e",
  green: "#2f6b45",
  beige: "#d8cbb2",
  cream: "#ece4d2",
  brown: "#5a3e2b",
  maroon: "#5c1a24",
};

/** Garment colour for the preview mockup (data, not UI theming). */
export function swatch(name: string) {
  return swatches[name.trim().toLowerCase()] ?? "#8a8a88";
}

export function estimate(s: CustomSettings, placement: string, qty: number) {
  const print =
    placement === "both"
      ? Number(s.front_print_price) + Number(s.back_print_price)
      : placement === "back"
        ? Number(s.back_print_price)
        : Number(s.front_print_price);
  return (Number(s.base_price) + print) * Math.max(1, qty);
}
