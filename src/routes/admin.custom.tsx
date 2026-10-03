import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { CUSTOM_STATUSES, customSettingsQuery, inr } from "@/lib/custom";

export const Route = createFileRoute("/admin/custom")({
  component: AdminCustom,
});

type CustomOrder = Tables<"custom_orders">;

const ordersQuery = {
  queryKey: ["custom-orders"],
  queryFn: async (): Promise<CustomOrder[]> => {
    const { data, error } = await supabase.from("custom_orders").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
};

function AdminCustom() {
  const [tab, setTab] = useState<"orders" | "setup">("orders");
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-[-0.04em]">Custom designs</h1>
      <div className="mt-6 flex gap-6 border-b border-border">
        {(["orders", "setup"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`label-xs -mb-px border-b-2 pb-3 ${tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            {t === "orders" ? "Requests" : "Setup"}
          </button>
        ))}
      </div>
      <div className="mt-8">{tab === "orders" ? <Orders /> : <Setup />}</div>
    </div>
  );
}

function DesignImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    supabase.storage
      .from("custom-designs")
      .createSignedUrl(path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);
  if (!path) return <div className="label-xs flex size-24 items-center justify-center border border-border text-muted-foreground">Text only</div>;
  if (!url) return <div className="size-24 animate-pulse bg-surface" />;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block size-24 border border-border bg-surface">
      <img src={url} alt="Customer design" className="h-full w-full object-contain" />
    </a>
  );
}

function Orders() {
  const { data = [], isLoading } = useQuery(ordersQuery);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  async function update(id: string, values: Partial<CustomOrder>) {
    const { error } = await supabase.from("custom_orders").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["custom-orders"] });
  }

  async function remove(o: CustomOrder) {
    if (!confirm(`Delete ${o.request_number}?`)) return;
    if (o.design_path) await supabase.storage.from("custom-designs").remove([o.design_path]);
    const { error } = await supabase.from("custom_orders").delete().eq("id", o.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["custom-orders"] });
  }

  const rows = data.filter(
    (o) =>
      (filter === "all" || o.status === filter) &&
      (!q || `${o.request_number} ${o.customer_name} ${o.customer_email} ${o.customer_phone}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone, ID" className="border border-border bg-transparent px-3 py-2 text-sm" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-border bg-background px-3 py-2 text-sm">
          <option value="all">All statuses ({data.length})</option>
          {CUSTOM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s} ({data.filter((o) => o.status === s).length})
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="label-xs mt-6 text-muted-foreground">Loading…</p>}
      {!isLoading && rows.length === 0 && <p className="label-xs mt-6 text-muted-foreground">No custom design requests yet.</p>}

      <div className="mt-6 space-y-4">
        {rows.map((o) => (
          <OrderCard key={o.id} o={o} onUpdate={update} onDelete={remove} />
        ))}
      </div>
    </div>
  );
}

function OrderCard({
  o,
  onUpdate,
  onDelete,
}: {
  o: CustomOrder;
  onUpdate: (id: string, v: Partial<CustomOrder>) => void;
  onDelete: (o: CustomOrder) => void;
}) {
  const [quote, setQuote] = useState(o.quoted_price?.toString() ?? "");
  const [notes, setNotes] = useState(o.admin_notes);
  const phone = o.customer_phone.replace(/\D/g, "").slice(-10);

  return (
    <div className="border border-border p-5">
      <div className="flex flex-wrap gap-5">
        <DesignImage path={o.design_path} />
        <div className="min-w-[200px] flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm">{o.request_number}</span>
            <span className="label-xs border border-border px-2 py-0.5">{o.status}</span>
            <span className="label-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</span>
          </div>
          <p className="mt-2 font-medium">{o.customer_name}</p>
          <p className="text-sm text-muted-foreground">
            {o.customer_email} · {o.customer_phone}
          </p>
          {o.address && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{o.address}</p>}
          <p className="mt-2 text-sm">
            {o.color} · {o.size} · {o.placement} · qty {o.quantity} · est. {inr(Number(o.estimated_total))}
          </p>
          {o.design_text && <p className="mt-1 text-sm">Text: “{o.design_text}”</p>}
          {o.notes && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line">{o.notes}</p>}
        </div>
        <div className="w-full space-y-2 sm:w-64">
          <select value={o.status} onChange={(e) => onUpdate(o.id, { status: e.target.value })} className="w-full border border-border bg-background px-3 py-2 text-sm">
            {CUSTOM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input value={quote} onChange={(e) => setQuote(e.target.value)} type="number" min={0} placeholder="Final quote ₹" className="w-full border border-border bg-transparent px-3 py-2 text-sm" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Internal notes" className="w-full border border-border bg-transparent px-3 py-2 text-sm" />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                onUpdate(o.id, {
                  quoted_price: quote === "" ? null : Number(quote),
                  admin_notes: notes,
                  ...(quote !== "" && o.status === "new" ? { status: "quoted" } : {}),
                })
              }
              className="label-xs bg-foreground px-3 py-2 text-background"
            >
              Save
            </button>
            {phone.length === 10 && (
              <a
                href={`https://wa.me/91${phone}?text=${encodeURIComponent(`Hi ${o.customer_name}, about your unlabelled custom design ${o.request_number}${o.quoted_price ? ` — final price ${inr(Number(o.quoted_price))}` : ""}.`)}`}
                target="_blank"
                rel="noreferrer"
                className="label-xs border border-border px-3 py-2"
              >
                WhatsApp
              </a>
            )}
            <a href={`mailto:${o.customer_email}?subject=${encodeURIComponent(`Your custom design ${o.request_number}`)}`} className="label-xs border border-border px-3 py-2">
              Email
            </a>
            <button type="button" onClick={() => onDelete(o)} className="label-xs text-muted-foreground hover:text-destructive">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Setup() {
  const { data: s } = useQuery(customSettingsQuery);
  const qc = useQueryClient();
  const [form, setForm] = useState<null | {
    enabled: boolean;
    base_price: string;
    front_print_price: string;
    back_print_price: string;
    colors: string;
    sizes: string;
    notes: string;
  }>(null);

  useEffect(() => {
    if (s && !form)
      setForm({
        enabled: s.enabled,
        base_price: String(s.base_price),
        front_print_price: String(s.front_print_price),
        back_print_price: String(s.back_print_price),
        colors: s.colors.join(", "),
        sizes: s.sizes.join(", "),
        notes: s.notes,
      });
  }, [s, form]);

  if (!form) return <p className="label-xs text-muted-foreground">Loading…</p>;

  const list = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!list(form.colors).length || !list(form.sizes).length) return toast.error("Add at least one colour and one size");
    const { error } = await supabase
      .from("custom_settings")
      .update({
        enabled: form.enabled,
        base_price: Number(form.base_price) || 0,
        front_print_price: Number(form.front_print_price) || 0,
        back_print_price: Number(form.back_print_price) || 0,
        colors: list(form.colors),
        sizes: list(form.sizes),
        notes: form.notes.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Custom setup saved");
    qc.invalidateQueries({ queryKey: ["custom-settings"] });
  }

  const input = "mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm";
  return (
    <form onSubmit={save} className="max-w-xl space-y-5">
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
        Accept new custom design requests
      </label>
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ["base_price", "Blank tee ₹"],
            ["front_print_price", "Front print ₹"],
            ["back_print_price", "Back print ₹"],
          ] as const
        ).map(([k, l]) => (
          <label key={k} className="label-xs text-muted-foreground">
            {l}
            <input type="number" min={0} className={input} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          </label>
        ))}
      </div>
      <label className="label-xs block text-muted-foreground">
        Colours (comma separated)
        <input className={input} value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} />
      </label>
      <label className="label-xs block text-muted-foreground">
        Sizes (comma separated)
        <input className={input} value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} />
      </label>
      <label className="label-xs block text-muted-foreground">
        Note shown to customers
        <textarea rows={3} className={input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </label>
      <button type="submit" className="label-xs bg-foreground px-5 py-3 text-background">
        Save setup
      </button>
    </form>
  );
}
