import { createFileRoute } from "@tanstack/react-router";
import { Check, Package, Search, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/track")({
  validateSearch: (s: Record<string, unknown>) => ({ order: typeof s["order"] === "string" ? s["order"] : undefined }),
  head: () => ({ meta: [
    { title: "Track Your Order — Comfort Hub" },
    { name: "description", content: "Check where your Comfort Hub order is using your order ID." },
    { property: "og:title", content: "Track Your Order — Comfort Hub" },
    { property: "og:description", content: "Live delivery status for your Comfort Hub order." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: TrackPage,
});

type Tracked = {
  order_number: string; status: string; payment_status: string; payment_method: string; total: number;
  shipping_method: string; city: string; created_at: string; courier: string; tracking_number: string;
  tracking_url: string; expected_delivery: string | null; delivered_at: string | null;
  items: { name: string; size: string; quantity: number }[];
  events: { status: string; location: string; note: string; created_at: string }[];
};

const steps = [["pending", "Placed"], ["confirmed", "Confirmed"], ["shipped", "Shipped"], ["delivered", "Delivered"]] as const;
const fmt = (d: string) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

function TrackPage() {
  const search = Route.useSearch();
  const [orderId, setOrderId] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Tracked | null>(null);
  useEffect(() => { if (search.order) setOrderId(search.order); }, [search.order]);

  async function track(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { data: res, error: err } = await supabase.rpc("track_order", { _order_number: orderId, _contact: contact });
    setLoading(false);
    if (err) return setError("Something went wrong. Please try again.");
    if (!res) { setData(null); return setError("No order matches that ID and email/phone. Check both and try again."); }
    setData(res as unknown as Tracked);
  }

  const cancelled = data?.status === "cancelled";
  const current = data ? steps.findIndex(([k]) => k === data.status) : -1;

  return <div className="mx-auto max-w-3xl px-5 py-14 md:px-10 md:py-20">
    <p className="label-xs text-muted-foreground">Order tracking</p>
    <h1 className="mt-3 text-4xl font-semibold md:text-6xl">TRACK YOUR ORDER</h1>
    <p className="mt-4 text-muted-foreground">Enter your order ID (like ORD-AB12CD34) and the email or phone number you ordered with.</p>
    <form onSubmit={track} className="mt-8 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
      <input required value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Order ID" className="border border-border bg-surface px-4 py-3 font-mono uppercase outline-none focus:ring-2 focus:ring-ring" />
      <input required value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or phone" className="border border-border bg-surface px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
      <Button type="submit" disabled={loading} className="h-auto py-3"><Search />{loading ? "Checking…" : "Track"}</Button>
    </form>
    {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

    {data && <div className="mt-12 space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div><p className="label-xs text-muted-foreground">Order</p><p className="font-mono text-2xl">{data.order_number}</p></div>
        <p className="text-sm text-muted-foreground">Placed {fmt(data.created_at)}</p>
      </div>

      {cancelled ? <p className="border border-destructive p-4 text-destructive">This order was cancelled. Contact us if you have questions.</p> :
        <ol className="grid grid-cols-4 gap-2">{steps.map(([k, label], i) => {
          const done = i <= current;
          return <li key={k} className="text-center">
            <div className={`mx-auto flex size-10 items-center justify-center rounded-full border ${done ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{done ? <Check className="size-5" /> : i + 1}</div>
            <p className={`label-xs mt-2 ${done ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
          </li>;
        })}</ol>}

      <div className="grid gap-px bg-border md:grid-cols-2">
        <Info label="Payment" value={`${data.payment_method === "cod" ? "Cash on delivery" : "UPI"} · ${data.payment_status}`} />
        <Info label="Total" value={`₹${Number(data.total).toLocaleString("en-IN")}`} />
        <Info label="Delivery" value={`${data.shipping_method}${data.city ? ` · to ${data.city}` : ""}`} />
        <Info label={data.delivered_at ? "Delivered" : "Expected by"} value={data.delivered_at ? fmt(data.delivered_at) : data.expected_delivery ? new Date(data.expected_delivery).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "We'll update this soon"} />
        <Info label="Courier" value={data.courier || "Not shipped yet"} />
        <div className="bg-background p-4"><p className="label-xs text-muted-foreground">Tracking number</p>
          <p className="mt-1 font-mono">{data.tracking_number || "—"}</p>
          {data.tracking_url.startsWith("https://") && <a href={data.tracking_url} target="_blank" rel="noopener noreferrer" className="label-xs mt-2 inline-flex items-center gap-1 underline"><Truck className="size-4" />Track with courier</a>}
        </div>
      </div>

      <div><h2 className="label-xs mb-3 text-muted-foreground">Items</h2>
        <ul className="divide-y divide-border border border-border">{data.items.map((it, i) => <li key={i} className="flex items-center gap-3 p-3 text-sm"><Package className="size-4 text-muted-foreground" />{it.name}{it.size && ` · ${it.size}`}<span className="ml-auto text-muted-foreground">×{it.quantity}</span></li>)}</ul>
      </div>

      <div><h2 className="label-xs mb-3 text-muted-foreground">Updates</h2>
        {data.events.length ? <ol className="space-y-4 border-l border-border pl-5">{data.events.map((ev, i) => <li key={i} className="relative">
          <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-primary" />
          <p className="font-medium">{ev.status}{ev.location && <span className="text-muted-foreground"> · {ev.location}</span>}</p>
          {ev.note && <p className="text-sm text-muted-foreground">{ev.note}</p>}
          <p className="label-xs mt-1 text-muted-foreground">{fmt(ev.created_at)}</p>
        </li>)}</ol> : <p className="text-sm text-muted-foreground">No updates yet — we'll post them here as your order moves.</p>}
      </div>
    </div>}
  </div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="bg-background p-4"><p className="label-xs text-muted-foreground">{label}</p><p className="mt-1 capitalize">{value}</p></div>;
}
