import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { smbCreateOrder, smbVerifyOrder } from "@/lib/smbupi.functions";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money, useCart } from "@/lib/cart";
import { SHIPPING_OPTIONS, totalsFor, type ShippingMethod } from "@/lib/checkout-options";
import { getPaymentStatus, submitUpiReference } from "@/lib/payments.functions";
import { emailOrderToOwner } from "@/lib/order-email.functions";
import { QRCodeSVG } from "qrcode.react";
import { useQuery } from "@tanstack/react-query";
import { UPI_ID, UPI_NAME, upiAccountsQuery, upiLink } from "@/lib/upi";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — unlabelled" },
      {
        name: "description",
        content: "Pay by UPI — scan the QR with GPay, PhonePe or Paytm. 5% off every unlabelled order.",
      },
      { property: "og:title", content: "Checkout — unlabelled" },
      { property: "og:description", content: "Pay by UPI. 5% off every order." },
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
  { name: "customer_name", label: "Full name", autoComplete: "name" },
  { name: "customer_email", label: "Email", autoComplete: "email" },
  { name: "customer_phone", label: "Phone", autoComplete: "tel" },
  { name: "address_line", label: "Address", autoComplete: "street-address" },
  { name: "city", label: "City", autoComplete: "address-level2" },
  { name: "postal_code", label: "Postal code", autoComplete: "postal-code" },
  { name: "country", label: "Country", autoComplete: "country-name" },
] as const;

// Set only in the cPanel copy; there the gateway runs through the PHP helper in /api.
const STATIC_HOST = import.meta.env["VITE_STATIC_HOST"] === "1";

async function phpCall(file: string, body: Record<string, string>) {
  const res = await fetch(`/api/${file}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    status?: string; number?: string; payment_url?: string; error?: string;
  };
  if (!res.ok) throw new Error(json.error ?? "Payment service unavailable");
  return json;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const steps = ["Details", "Shipping", "Payment"] as const;

function Checkout() {
  const { lines, subtotal, clear } = useCart();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<{ number: string; paid: boolean } | null>(null);
  const [shipping, setShipping] = useState<ShippingMethod>("standard");
  const [upiOrder, setUpiOrder] = useState<{
    id: string;
    number: string;
    amount: number;
  } | null>(null);
  const [utr, setUtr] = useState("");
  const [checking, setChecking] = useState(false);
  const [payTo, setPayTo] = useState<string | null>(null);

  const { data: upiAccounts = [] } = useQuery(upiAccountsQuery);
  const activeUpi = upiAccounts.filter((a) => a.is_active);
  const selectedUpi =
    activeUpi.find((a) => a.upi_id === payTo) ??
    activeUpi.find((a) => a.is_default) ??
    activeUpi[0] ??
    null;
  const payVpa = selectedUpi?.upi_id ?? UPI_ID;
  const payName = selectedUpi?.payee_name ?? UPI_NAME;


  const notifyOwner = useServerFn(emailOrderToOwner);
  const sendUpiRef = useServerFn(submitUpiReference);
  const readPaymentStatus = useServerFn(getPaymentStatus);
  const createSmb = useServerFn(smbCreateOrder);
  const verifySmb = useServerFn(smbVerifyOrder);
  const [returning, setReturning] = useState(false);

  // Customer is back from the gateway: verify on the server, never trust the URL.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("smb");
    if (!id) return;
    setReturning(true);
    (async () => {
      for (let i = 0; i < 10; i++) {
        const r = STATIC_HOST
          ? await phpCall("check-status.php", { order_id: id }).catch(() => null)
          : await verifySmb({ data: { orderId: id } }).catch(() => null);
        if (r?.status === "success") {
          clear();
          await notifyOwner({ data: { orderId: id } }).catch(() => undefined);
          setPlaced({ number: String(r.number ?? ""), paid: true });
          setReturning(false);
          return;
        }
        if (r?.status === "failed") break;
        await wait(3000);
      }
      setReturning(false);
      toast.error("Payment not confirmed yet. If money was debited, contact us with your order number.");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function payInstantly() {
    if (!upiOrder) return;
    setSubmitting(true);
    try {
      const paymentUrl = STATIC_HOST
        ? String((await phpCall("create-order.php", { order_id: upiOrder.id })).payment_url ?? "")
        : (await createSmb({ data: { orderId: upiOrder.id, returnUrl: window.location.href } })).paymentUrl;
      if (!paymentUrl.startsWith("https://smbupi.com/")) throw new Error("Could not start payment");
      window.location.href = paymentUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start payment");
      setSubmitting(false);
    }
  }


  async function confirmUpi() {
    if (!upiOrder) return;
    setSubmitting(true);
    try {
      // Database functions work on both the hosted site and the cPanel copy.
      const { error: refError } = await supabase.rpc("submit_upi_reference", {
        _order_id: upiOrder.id,
        _reference: utr,
      });
      if (refError) throw new Error(refError.message);
      await notifyOwner({ data: { orderId: upiOrder.id } }).catch(() => undefined);
      clear();
      setChecking(true);

      // Wait for the studio to confirm the money actually landed.
      let paid = false;
      for (let i = 0; i < 40; i++) {
        const { data: st } = await supabase.rpc("order_payment_status", { _order_id: upiOrder.id });
        const s = st ? { paid: st === "paid", rejected: st === "payment_failed" } : null;
        if (s?.paid) {
          paid = true;
          break;
        }
        if (s?.rejected) {
          setChecking(false);
          setSubmitting(false);
          toast.error("We couldn't find that payment. Please check the reference and try again.");
          return;
        }
        await wait(3000);
      }
      setChecking(false);
      setPlaced({ number: upiOrder.number, paid });
    } catch (err) {
      setChecking(false);
      toast.error(err instanceof Error ? err.message : "Could not save that reference");
    } finally {
      setSubmitting(false);
    }
  }

  const t = totalsFor(subtotal, shipping, "upi");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      toast.error("Check the highlighted fields");
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      // Customers can't read the orders table, so place the order through a
      // database function that returns the new order's id and number.
      const { data: rows, error } = await supabase.rpc("place_order", {
        _order: {
          ...parsed.data,
          subtotal,
          discount: t.discount,
          shipping_method: shipping,
          shipping_fee: t.shipping,
          total: t.total,
        },
        _items: lines.map((l) => ({
          product_id: l.productId,
          product_name: l.name,
          size: l.size,
          quantity: l.quantity,
          unit_price: l.price,
        })),
      });
      if (error) throw error;
      const order = Array.isArray(rows) ? rows[0] : rows;
      if (!order) throw new Error("We couldn't place your order. Please try again.");

      setUpiOrder({ id: order.id, number: order.order_number, amount: t.total });
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "We couldn't place your order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (returning && !placed) {
    return (
      <div className="mx-auto max-w-[620px] px-5 py-24 md:px-10">
        <p className="label-xs text-muted-foreground">Verifying payment</p>
        <h1 className="mt-4 text-4xl font-semibold">CHECKING…</h1>
        <p className="mt-4 text-sm text-muted-foreground">Confirming your UPI payment with the bank. Keep this page open.</p>
      </div>
    );
  }

  if (upiOrder && !placed) {
    return (
      <div className="mx-auto max-w-[620px] px-5 py-20 md:px-10">
        <p className="label-xs text-muted-foreground">Step 03 · UPI payment</p>
        <h1 className="mt-4 text-4xl font-semibold md:text-5xl">PAY {money(upiOrder.amount)}</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Order <span className="font-mono text-foreground">{upiOrder.number}</span> is reserved.
        </p>

        <>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void payInstantly()}
          className="mt-8 w-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Opening payment…" : `Pay ${money(upiOrder.amount)} — auto-verified`}
        </button>
        <p className="label-xs mt-3 text-muted-foreground">
          Pay with any UPI app. Your order is confirmed automatically once the payment lands.
        </p>

        </>
        <p className="label-xs mt-10 text-muted-foreground">Or pay manually</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Scan the code with any UPI app, or tap the button on mobile.
        </p>


        {activeUpi.length > 1 && (
          <div className="mt-6 space-y-2 border border-border bg-surface p-4">
            <p className="label-xs text-muted-foreground">Choose where to pay</p>
            {activeUpi.map((a) => (
              <label key={a.id} className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="radio"
                  name="upi-account"
                  checked={payVpa === a.upi_id}
                  onChange={() => setPayTo(a.upi_id)}
                />
                <span>
                  <span className="font-mono">{a.upi_id}</span>
                  {a.label && (
                    <span className="label-xs block text-muted-foreground">{a.label}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-5 border border-border bg-surface p-8">
          <div className="bg-white p-4">
            <QRCodeSVG
              value={upiLink(upiOrder.amount, `unlabelled ${upiOrder.number}`, payVpa, payName)}
              size={200}
            />
          </div>
          <p className="label-xs text-muted-foreground">
            UPI ID <span className="font-mono text-foreground">{payVpa}</span>
          </p>
          <a
            href={upiLink(upiOrder.amount, `unlabelled ${upiOrder.number}`, payVpa, payName)}
            className="w-full bg-primary px-6 py-3 text-center text-sm text-primary-foreground md:hidden"
          >
            Open UPI app
          </a>
        </div>


        <label htmlFor="utr" className="label-xs mt-8 block text-muted-foreground">
          UPI reference / UTR number
        </label>
        <input
          id="utr"
          value={utr}
          onChange={(e) => setUtr(e.target.value)}
          placeholder="e.g. 402312345678"
          className="mt-2 w-full border border-border bg-surface px-4 py-3 font-mono text-sm outline-none focus:border-foreground"
        />
        <button
          type="button"
          disabled={submitting}
          onClick={() => void confirmUpi()}
          className="mt-4 w-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {checking ? "Checking payment…" : submitting ? "Saving…" : "I've paid — confirm order"}
        </button>
        <p className="label-xs mt-4 text-muted-foreground">
          {checking
            ? "We're matching your reference against the UPI account. This usually takes a few minutes — keep this page open."
            : "Enter the 12-digit reference exactly as it appears in your UPI app. We check it against the UPI account before the order is confirmed."}
        </p>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-[700px] px-5 py-24 md:px-10">
        <p className="label-xs text-muted-foreground">
          {placed.paid ? "Payment received" : "Order received"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold md:text-6xl">THANK YOU</h1>
        <p className="mt-6 text-muted-foreground">
          Your order <span className="font-mono text-foreground">{placed.number}</span> is in
          {placed.paid
            ? " and your payment has been confirmed. We pack and dispatch within two working days and email you tracking the moment it leaves the studio."
            : ". We're still matching your payment reference — you'll get an email the moment it's confirmed, and we dispatch right after."}
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
        <div className="flex gap-6">
          {steps.map((s, i) => (
            <span key={s} className="label-xs text-muted-foreground">
              <span className="font-mono text-foreground">0{i + 1}</span> {s}
            </span>
          ))}
        </div>
        <h1 className="mt-4 text-4xl font-semibold md:text-6xl">CHECKOUT</h1>

        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          {fields.map((f) => (
            <div key={f.name}>
              <label htmlFor={f.name} className="label-xs text-muted-foreground">
                {f.label}
              </label>
              <input
                id={f.name}
                name={f.name}
                autoComplete={f.autoComplete}
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

          <fieldset className="border border-border bg-surface p-4">
            <legend className="label-xs px-2 text-muted-foreground">Shipping</legend>
            <div className="space-y-3">
              {SHIPPING_OPTIONS.map((o) => {
                const fee = o.freeOver && subtotal >= o.freeOver ? 0 : o.fee;
                return (
                  <label
                    key={o.id}
                    className="flex cursor-pointer items-center justify-between gap-4 text-sm"
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        checked={shipping === o.id}
                        onChange={() => setShipping(o.id)}
                      />
                      <span>
                        {o.label}
                        <span className="label-xs block text-muted-foreground">{o.eta}</span>
                      </span>
                    </span>
                    <span className="font-mono">{fee === 0 ? "Free" : money(fee)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="border border-border bg-surface p-4">
            <legend className="label-xs px-2 text-muted-foreground">Payment</legend>
            <p className="text-sm">
              UPI — GPay, PhonePe, Paytm, any app
              <span className="label-xs block text-muted-foreground">
                5% off · scan the QR on the next step and confirm with your UTR
              </span>
            </p>
          </fieldset>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {submitting ? "Processing…" : `Continue to UPI payment · ${money(t.total)}`}
          </button>
        </form>
      </div>

      <aside className="h-fit border border-border bg-surface p-6 md:sticky md:top-24">
        <p className="label-xs text-muted-foreground">Order summary</p>
        <div className="mt-5 space-y-4">
          {lines.map((l) => (
            <div key={`${l.productId}-${l.size}`} className="flex justify-between gap-4 text-sm">
              <span>
                {l.name}{" "}
                <span className="text-muted-foreground">
                  · {l.size} × {l.quantity}
                </span>
              </span>
              <span className="font-mono">{money(l.price * l.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-2 border-t border-border pt-5 text-sm">
          <div className="flex justify-between">
            <span className="label-xs text-muted-foreground">Subtotal</span>
            <span className="font-mono">{money(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="label-xs text-muted-foreground">Prepaid discount (5%)</span>
            <span className="font-mono">{t.discount ? `− ${money(t.discount)}` : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="label-xs text-muted-foreground">Shipping</span>
            <span className="font-mono">{t.shipping ? money(t.shipping) : "Free"}</span>
          </div>
        </div>
        <div className="mt-4 flex justify-between border-t border-border pt-4">
          <span className="label-xs text-muted-foreground">Total</span>
          <span className="font-mono text-lg">{money(t.total)}</span>
        </div>
        <p className="label-xs mt-5 text-muted-foreground">
          Secure payments · 14-day returns · dispatched in 48h
        </p>
      </aside>
    </div>
  );
}
