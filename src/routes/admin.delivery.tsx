import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { printDocs, getSender, setSender, type PrintOrder } from "@/lib/print-docs";

function SenderBox() {
  const [v, setV] = useState("");
  const [openBox, setOpenBox] = useState(false);
  return <div className="border border-border bg-background p-3">
    <button type="button" className="text-sm font-medium" onClick={() => { setV(getSender()); setOpenBox(!openBox); }}>
      {openBox ? "▾" : "▸"} Dispatch / return address (printed on labels & invoices)
    </button>
    {openBox && <div className="mt-2 space-y-2">
      <textarea value={v} onChange={(e) => setV(e.target.value)} rows={4} className="w-full border border-border bg-surface px-3 py-2 text-sm" />
      <Button size="sm" onClick={() => { setSender(v); toast.success("Address saved"); setOpenBox(false); }}>Save address</Button>
    </div>}
  </div>;
}

export const Route = createFileRoute("/admin/delivery")({
  head: () => ({ meta: [
    { title: "Delivery — Comfort Hub Admin" },
    { name: "description", content: "Manage shipping, couriers and tracking updates." },
    { property: "og:title", content: "Delivery — Comfort Hub Admin" },
    { property: "og:description", content: "Manage shipping, couriers and tracking updates." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Delivery,
});

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Status = Database["public"]["Enums"]["order_status"];
const STATUSES: Status[] = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const COURIERS = ["Delhivery", "Blue Dart", "DTDC", "Ekart", "India Post", "Xpressbees", "Shadowfax", "Self delivery"];
const QUICK = ["Packed", "Picked up by courier", "In transit", "Reached local hub", "Out for delivery", "Delivered", "Delivery attempted"];

function Delivery() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Status | "all">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-delivery"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return data;
    },
  });
  const counts = Object.fromEntries(STATUSES.map((s) => [s, orders.filter((o) => o.status === s).length]));
  const visible = orders.filter((o) => (filter === "all" || o.status === filter) &&
    (!q || `${o.order_number} ${o.customer_name} ${o.customer_phone} ${o.tracking_number}`.toLowerCase().includes(q.toLowerCase())));

  return <div className="space-y-6">
    <div><p className="label-xs text-muted-foreground">Shipping</p><h1 className="text-3xl font-semibold">Delivery</h1></div>
    <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-5">{STATUSES.map((s) =>
      <button key={s} type="button" onClick={() => setFilter(filter === s ? "all" : s)} className={`p-4 text-left ${filter === s ? "bg-primary text-primary-foreground" : "bg-background"}`}>
        <p className="label-xs capitalize opacity-70">{s === "pending" ? "To confirm" : s}</p><p className="text-2xl font-semibold">{counts[s]}</p>
      </button>)}</div>
    <SenderBox />
    <div className="flex flex-wrap gap-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order, name, phone, tracking no." className="min-w-0 flex-1 border border-border bg-surface px-4 py-2 outline-none focus:ring-2 focus:ring-ring" />
      <Button variant="outline" disabled={!visible.length} onClick={() => printDocs("label", visible as unknown as PrintOrder[])}>Print {visible.length} labels</Button>
      <Button variant="outline" disabled={!visible.length} onClick={() => printDocs("invoice", visible as unknown as PrintOrder[])}>Print {visible.length} invoices</Button>
    </div>
    {isLoading ? <p className="label-xs text-muted-foreground">Loading…</p> :
      <div className="divide-y divide-border border border-border bg-background">
        {visible.map((o) => <div key={o.id}>
          <button type="button" onClick={() => setOpen(open === o.id ? null : o.id)} className="flex w-full flex-wrap items-center gap-3 p-4 text-left hover:bg-muted">
            <span className="font-mono">{o.order_number}</span><span>{o.customer_name}</span>
            <span className="text-sm text-muted-foreground">{o.city}</span>
            <span className="ml-auto label-xs capitalize">{o.status}</span>
            <span className="text-xs text-muted-foreground">{o.courier || "no courier"}{o.tracking_number && ` · ${o.tracking_number}`}</span>
          </button>
          {open === o.id && <Editor order={o} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-delivery"] })} />}
        </div>)}
        {!visible.length && <p className="p-8 text-center text-sm text-muted-foreground">No orders here.</p>}
      </div>}
  </div>;
}

function Editor({ order, onSaved }: { order: Order; onSaved: () => void }) {
  const [f, setF] = useState({ status: order.status, courier: order.courier, tracking_number: order.tracking_number, tracking_url: order.tracking_url, expected_delivery: order.expected_delivery ?? "" });
  const [ev, setEv] = useState({ status: "", location: "", note: "" });
  const [busy, setBusy] = useState(false);
  const { data: events = [], refetch } = useQuery({
    queryKey: ["order-events", order.id],
    queryFn: async () => (await supabase.from("order_events").select("*").eq("order_id", order.id).order("created_at", { ascending: false })).data ?? [],
  });
  const input = "w-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  async function save() {
    if (f.tracking_url && !f.tracking_url.startsWith("https://")) return void toast.error("Tracking link must start with https://");
    setBusy(true);
    const statusChanged = f.status !== order.status;
    const { error } = await supabase.from("orders").update({
      ...f, expected_delivery: f.expected_delivery || null,
      delivered_at: f.status === "delivered" ? order.delivered_at ?? new Date().toISOString() : null,
    }).eq("id", order.id);
    if (!error && statusChanged) await supabase.from("order_events").insert({ order_id: order.id, status: `Order ${f.status}`, note: "" });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Delivery details saved"); onSaved(); void refetch();
  }
  async function addEvent() {
    if (!ev.status.trim()) return void toast.error("Write an update first");
    const { error } = await supabase.from("order_events").insert({ order_id: order.id, ...ev });
    if (error) return void toast.error(error.message);
    setEv({ status: "", location: "", note: "" }); void refetch(); toast.success("Update posted — the customer can see it");
  }
  async function removeEvent(id: string) { await supabase.from("order_events").delete().eq("id", id); void refetch(); }

  return <div className="grid gap-6 bg-surface p-4 md:grid-cols-2">
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{order.customer_phone} · {order.address_line}, {order.city} {order.postal_code}</p>
      <label className="block text-sm">Status<select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Status })} className={input}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label className="block text-sm">Courier<input list="couriers" value={f.courier} onChange={(e) => setF({ ...f, courier: e.target.value })} className={input} /></label>
      <datalist id="couriers">{COURIERS.map((c) => <option key={c} value={c} />)}</datalist>
      <label className="block text-sm">Tracking number<input value={f.tracking_number} onChange={(e) => setF({ ...f, tracking_number: e.target.value })} className={`${input} font-mono`} /></label>
      <label className="block text-sm">Courier tracking link<input value={f.tracking_url} placeholder="https://" onChange={(e) => setF({ ...f, tracking_url: e.target.value })} className={input} /></label>
      <label className="block text-sm">Expected delivery<input type="date" value={f.expected_delivery} onChange={(e) => setF({ ...f, expected_delivery: e.target.value })} className={input} /></label>
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        <Button variant="outline" asChild><a href={`/track?order=${encodeURIComponent(order.order_number)}`} target="_blank" rel="noreferrer">Customer view</a></Button>
        {order.customer_phone && <Button variant="outline" asChild><a target="_blank" rel="noreferrer" href={`https://wa.me/91${order.customer_phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`Hi ${order.customer_name}, your Comfort Hub order ${order.order_number} is ${f.status}.${f.tracking_number ? ` ${f.courier} tracking: ${f.tracking_number}.` : ""} Track it: ${window.location.origin}/track?order=${order.order_number}`)}`}>WhatsApp update</a></Button>}
        <Button variant="outline" onClick={() => printDocs("label", [{ ...(order as unknown as PrintOrder), courier: f.courier, tracking_number: f.tracking_number }])}>Print label</Button>
        <Button variant="outline" onClick={() => printDocs("invoice", [{ ...(order as unknown as PrintOrder), courier: f.courier, tracking_number: f.tracking_number }])}>Print invoice</Button>
      </div>
    </div>
    <div className="space-y-3">
      <p className="label-xs text-muted-foreground">Post a tracking update</p>
      <div className="flex flex-wrap gap-1">{QUICK.map((s) => <button key={s} type="button" onClick={() => setEv({ ...ev, status: s })} className="label-xs border border-border px-2 py-1 hover:bg-muted">{s}</button>)}</div>
      <input value={ev.status} onChange={(e) => setEv({ ...ev, status: e.target.value })} placeholder="Update (e.g. In transit)" className={input} />
      <input value={ev.location} onChange={(e) => setEv({ ...ev, location: e.target.value })} placeholder="Location (optional)" className={input} />
      <input value={ev.note} onChange={(e) => setEv({ ...ev, note: e.target.value })} placeholder="Note for customer (optional)" className={input} />
      <Button variant="secondary" onClick={addEvent}>Post update</Button>
      <ol className="space-y-2 pt-2">{events.map((e) => <li key={e.id} className="flex gap-2 border-b border-border pb-2 text-sm">
        <div className="flex-1"><p>{e.status}{e.location && ` · ${e.location}`}</p>{e.note && <p className="text-muted-foreground">{e.note}</p>}<p className="label-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("en-IN")}</p></div>
        <button type="button" onClick={() => void removeEvent(e.id)} className="label-xs text-destructive">Remove</button>
      </li>)}</ol>
    </div>
  </div>;
}
