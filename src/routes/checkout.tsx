import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money, useCart } from "@/lib/cart";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Concrete" },
      { name: "description", content: "Place your Concrete order with cash on delivery." },
      { property: "og:title", content: "Checkout — Concrete" },
      { property: "og:description", content: "Place your Concrete order with cash on delivery." },
    ],
  }),
  component: Checkout,
});

const schema = z.object({
  customer_name: z.string().trim().min(2, "Enter your full name").max(100),
  customer_email: z.string().trim().email("Enter a valid email").max(255),
  customer_phone: z.string().trim().min(6, "Enter a phone number").max(30),
  address_line: z.string().trim().min(4, "Enter your street address").max(200),
  city: z.string().trim().min(2, "Enter your city").max(100),
  postal_code: z.string().trim().min(2, "Enter a postal code").max(20),
  country: z.string().trim().min(2, "Enter your country").max(100),
  notes: z.string().trim().max(500).optional().default(""),
});

const fields = [
  { name: "customer_name", label: "Full name" },
  { name: "customer_email", label: "Email" },
  { name: "customer_phone", label: "Phone" },
  { name: "address_line", label: "Address" },
  { name: "city", label: "City" },
  { name: "postal_code", label: "Postal code" },
  { name: "country", label: "Country" },
] as const;

function Checkout() {
  const { lines, subtotal, clear } = useCart();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({ ...parsed.data, total: subtotal, payment_method: "cod" })
        .select("id, order_number")
        .single();
      if (error) throw error;

      const { error: itemsError } = await supabase.from("order_items").insert(
        lines.map((l) => ({
          order_id: order.id,
          product_id: l.productId,
          product_name: l.name,
          size: l.size,
          quantity: l.quantity,
          unit_price: l.price,
        })),
      );
      if (itemsError) throw itemsError;

      clear();
      setPlaced(order.order_number);
    } catch (err) {
      console.error(err);
      toast.error("We couldn't place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-[700px] px-5 py-24 md:px-10">
        <p className="label-xs text-muted-foreground">Order confirmed</p>
        <h1 className="mt-4 text-4xl font-semibold md:text-6xl">THANK YOU</h1>
        <p className="mt-6 text-muted-foreground">
          Your order <span className="font-mono text-foreground">{placed}</span> is in. We'll email
          you tracking as soon as it ships. Payment is due on delivery.
        </p>
        <Link
          to="/shop"
          className="mt-10 inline-flex bg-primary px-6 py-3 text-sm text-primary-foreground"
        >
          Keep shopping
        </Link>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-[700px] px-5 py-24 md:px-10">
        <h1 className="text-3xl font-semibold">Your cart is empty</h1>
        <Link
          to="/shop"
          className="mt-6 inline-flex bg-primary px-6 py-3 text-sm text-primary-foreground"
        >
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-14 md:grid-cols-[1.2fr_0.8fr] md:px-10 md:py-20">
      <div>
        <h1 className="text-4xl font-semibold md:text-6xl">CHECKOUT</h1>
        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          {fields.map((f) => (
            <div key={f.name}>
              <label htmlFor={f.name} className="label-xs text-muted-foreground">
                {f.label}
              </label>
              <input
                id={f.name}
                name={f.name}
                className="mt-2 w-full border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-foreground"
              />
              {errors[f.name] && (
                <p className="label-xs mt-1 text-destructive">{errors[f.name]}</p>
              )}
            </div>
          ))}
          <div>
            <label htmlFor="notes" className="label-xs text-muted-foreground">
              Delivery notes (optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="mt-2 w-full border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-foreground"
            />
          </div>
          <div className="border border-border bg-surface px-4 py-3">
            <p className="label-xs text-muted-foreground">Payment</p>
            <p className="mt-1 text-sm">Cash on delivery</p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {submitting ? "Placing order…" : `Place order · ${money(subtotal)}`}
          </button>
        </form>
      </div>

      <aside className="h-fit border border-border bg-surface p-6">
        <p className="label-xs text-muted-foreground">Order summary</p>
        <div className="mt-5 space-y-4">
          {lines.map((l) => (
            <div key={`${l.productId}-${l.size}`} className="flex justify-between gap-4 text-sm">
              <span>
                {l.name} <span className="text-muted-foreground">· {l.size} × {l.quantity}</span>
              </span>
              <span className="font-mono">{money(l.price * l.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-between border-t border-border pt-5">
          <span className="label-xs text-muted-foreground">Total</span>
          <span className="font-mono text-lg">{money(subtotal)}</span>
        </div>
      </aside>
    </div>
  );
}
