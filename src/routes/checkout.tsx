import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money, useCart } from "@/lib/cart";
import {
  SHIPPING_OPTIONS,
  totalsFor,
  type PaymentMethod,
  type ShippingMethod,
} from "@/lib/checkout-options";
import {
  createPaymentOrder,
  getPaymentConfig,
  submitUpiReference,
  verifyPayment,
} from "@/lib/payments.functions";
import { emailOrderToOwner } from "@/lib/order-email.functions";
import { QRCodeSVG } from "qrcode.react";
import { UPI_ID, upiLink } from "@/lib/upi";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — unlabelled" },
      {
        name: "description",
        content:
          "Pay securely with UPI, cards or netbanking through BharatPe — 5% off every prepaid unlabelled order.",
      },
      { property: "og:title", content: "Checkout — unlabelled" },
      {
        property: "og:description",
        content: "Secure UPI, card and netbanking payments. 5% off prepaid orders.",
      },
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

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const steps = ["Details", "Shipping", "Payment"] as const;

function Checkout() {
  const { lines, subtotal, clear } = useCart();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<{ number: string; paid: boolean } | null>(null);
  const [shipping, setShipping] = useState<ShippingMethod>("standard");
  const [payment, setPayment] = useState<PaymentMethod>("upi");
  const [config, setConfig] = useState<{ bharatpe: boolean } | null>(null);
  const [paying, setPaying] = useState(false);
  const [upiOrder, setUpiOrder] = useState<{
    id: string;
    number: string;
    amount: number;
  } | null>(null);
  const [utr, setUtr] = useState("");

  const readConfig = useServerFn(getPaymentConfig);
  const createPayment = useServerFn(createPaymentOrder);
  const confirmPayment = useServerFn(verifyPayment);
  const notifyOwner = useServerFn(emailOrderToOwner);
  const sendUpiRef = useServerFn(submitUpiReference);

  useEffect(() => {
    readConfig().then(setConfig).catch(() => undefined);
  }, [readConfig]);

  async function confirmUpi() {
    if (!upiOrder) return;
    setSubmitting(true);
    try {
      await sendUpiRef({ data: { orderId: upiOrder.id, reference: utr } });
      await notifyOwner({ data: { orderId: upiOrder.id } }).catch(() => undefined);
      clear();
      setPlaced({ number: upiOrder.number, paid: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that reference");
    } finally {
      setSubmitting(false);
    }
  }

  const t = totalsFor(subtotal, shipping, payment);

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
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          ...parsed.data,
          subtotal,
          discount: t.discount,
          shipping_method: shipping,
          shipping_fee: t.shipping,
          total: t.total,
          payment_method: payment,
          payment_status: payment === "cod" ? "cod_pending" : "pending",
        })
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

      if (payment === "upi") {
        setUpiOrder({ id: order.id, number: order.order_number, amount: t.total });
        setSubmitting(false);
        return;
      }

      let paid = false;
      if (payment === "bharatpe") {
        paid = await runGateway(order.id, order.order_number, parsed.data);
        if (!paid) {
          setSubmitting(false);
          return;
        }
      }

      await notifyOwner({ data: { orderId: order.id } }).catch(() => undefined);
      clear();
      setPlaced({ number: order.order_number, paid });
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "We couldn't place your order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function runGateway(
    orderId: string,
    orderNumber: string,
    who: { customer_name: string; customer_email: string; customer_phone: string },
  ) {
    const session = await createPayment({
      data: {
        orderId,
        orderNumber,
        amount: t.total,
        name: who.customer_name,
        email: who.customer_email,
        phone: who.customer_phone,
        returnUrl: `${window.location.origin}/checkout`,
      },
    });

    // Open the BharatPe hosted checkout and poll our server for the settled txn.
    const win = window.open(session.paymentUrl, "bharatpe-checkout", "width=480,height=720");
    if (!win) {
      toast.error("Allow pop-ups to complete the payment.");
      return false;
    }

    setPaying(true);
    let paid = false;
    try {
      for (let i = 0; i < 120; i++) {
        await wait(3000);
        const v = await confirmPayment({
          data: { orderId, gatewayOrderId: session.gatewayOrderId },
        }).catch(() => ({ paid: false as const }));
        if (v.paid) {
          paid = true;
          break;
        }
        if (win.closed) break;
      }
    } finally {
      setPaying(false);
      if (!win.closed) win.close();
    }

    if (!paid) {
      toast.error("We couldn't confirm the payment. Your order is saved as unpaid.");
    }
    return paid;
  }

  if (upiOrder && !placed) {
    return (
      <div className="mx-auto max-w-[620px] px-5 py-20 md:px-10">
        <p className="label-xs text-muted-foreground">Step 03 · UPI payment</p>
        <h1 className="mt-4 text-4xl font-semibold md:text-5xl">PAY {money(upiOrder.amount)}</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Order <span className="font-mono text-foreground">{upiOrder.number}</span> is reserved.
          Scan the code with any UPI app, or tap the button on mobile.
        </p>

        <div className="mt-8 flex flex-col items-center gap-5 border border-border bg-surface p-8">
          <div className="bg-white p-4">
            <QRCodeSVG
              value={upiLink(upiOrder.amount, `unlabelled ${upiOrder.number}`)}
              size={200}
            />
          </div>
          <p className="label-xs text-muted-foreground">
            UPI ID <span className="font-mono text-foreground">{UPI_ID}</span>
          </p>
          <a
            href={upiLink(upiOrder.amount, `unlabelled ${upiOrder.number}`)}
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
          {submitting ? "Saving…" : "I've paid — confirm order"}
        </button>
        <p className="label-xs mt-4 text-muted-foreground">
          We match the reference against the UPI statement and dispatch once it clears — usually
          within a few minutes.
        </p>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-[700px] px-5 py-24 md:px-10">
        <p className="label-xs text-muted-foreground">Order confirmed</p>
        <h1 className="mt-4 text-4xl font-semibold md:text-6xl">THANK YOU</h1>
        <p className="mt-6 text-muted-foreground">
          Your order <span className="font-mono text-foreground">{placed.number}</span> is in
          {placed.paid ? " and payment is confirmed" : ""}. We pack and dispatch within two working
          days and email you tracking the moment it leaves the studio.
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

  const methods: { id: PaymentMethod; label: string; note: string; enabled: boolean }[] = [
    {
      id: "upi",
      label: "UPI — GPay, PhonePe, Paytm, any app",
      note: "5% off · scan the QR and confirm with your UTR",
      enabled: true,
    },
    {
      id: "bharatpe",
      label: "BharatPe — UPI, cards, netbanking",
      note: "5% off · payment auto-verified by transaction ID",
      enabled: config?.bharatpe ?? false,
    },
    { id: "cod", label: "Cash on delivery", note: "Pay the courier", enabled: true },
  ];

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
            <div className="space-y-3">
              {methods.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center justify-between gap-4 text-sm ${m.enabled ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      disabled={!m.enabled}
                      checked={payment === m.id}
                      onChange={() => setPayment(m.id)}
                    />
                    <span>
                      {m.label}
                      <span className="label-xs block text-muted-foreground">{m.note}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {submitting
              ? paying
                ? "Waiting for payment confirmation…"
                : "Processing…"
              : payment === "cod"
                ? `Place order · ${money(t.total)}`
                : `Pay ${money(t.total)} securely`}
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
