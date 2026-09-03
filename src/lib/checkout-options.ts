export type ShippingMethod = "standard" | "express" | "pickup";

export const SHIPPING_OPTIONS: {
  id: ShippingMethod;
  label: string;
  eta: string;
  fee: number;
  freeOver?: number;
}[] = [
  {
    id: "standard",
    label: "Standard delivery",
    eta: "4–6 working days · tracked",
    fee: 79,
    freeOver: 2999,
  },
  { id: "express", label: "Express delivery", eta: "1–2 working days · tracked", fee: 249 },
  { id: "pickup", label: "Studio pickup", eta: "Ready in 24h · Unit 14, Grey Yard", fee: 0 },
];

export type PaymentMethod = "paytm" | "cod";

/** Prepaid orders get 5% off. Cash on delivery does not. */
export const PREPAID_DISCOUNT = 0.05;

export function shippingFeeFor(method: ShippingMethod, subtotal: number) {
  const opt = SHIPPING_OPTIONS.find((o) => o.id === method) ?? SHIPPING_OPTIONS[0]!;
  if (opt.freeOver && subtotal >= opt.freeOver) return 0;
  return opt.fee;
}

export function totalsFor(subtotal: number, method: ShippingMethod, payment: PaymentMethod) {
  const shipping = shippingFeeFor(method, subtotal);
  const discount = payment === "cod" ? 0 : Math.round(subtotal * PREPAID_DISCOUNT);
  return { shipping, discount, total: Math.max(0, subtotal - discount + shipping) };
}
