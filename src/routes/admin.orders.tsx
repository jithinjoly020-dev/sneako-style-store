import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/cart";
import { downloadCsv } from "@/lib/export-csv";


export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

const ordersQuery = {
  queryKey: ["admin-orders"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

function AdminOrders() {
  const { data: orders = [] } = useQuery(ordersQuery);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const term = q.trim().toLowerCase();
  const visible = orders
    .filter((o) => filter === "all" || o.status === filter)
    .filter(
      (o) =>
        !term ||
        [o.order_number, o.customer_name, o.customer_email, o.customer_phone, o.city]
          .join(" ")
          .toLowerCase()
          .includes(term),
    );

  const countFor = (s: "all" | Status) =>
    s === "all" ? orders.length : orders.filter((o) => o.status === s).length;
  const filteredRevenue = visible
    .filter((o) => o.status !== "cancelled")
    .reduce((n, o) => n + Number(o.total), 0);

  async function setPayment(id: string, payment_status: "paid" | "payment_failed") {
    const { error } = await supabase.from("orders").update({ payment_status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (payment_status === "paid") {
      await supabase.from("orders").update({ status: "confirmed" }).eq("id", id);
    }
    toast.success(payment_status === "paid" ? "Payment confirmed" : "Payment marked not received");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  async function updateStatus(id: string, status: Status) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Order marked ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  function exportCsv() {
    downloadCsv(
      `orders-${new Date().toISOString().slice(0, 10)}.csv`,
      visible.map((o) => ({
        order_number: o.order_number,
        date: new Date(o.created_at).toLocaleString(),
        status: o.status,
        customer: o.customer_name,
        email: o.customer_email,
        phone: o.customer_phone,
        address: `${o.address_line}, ${o.city} ${o.postal_code}, ${o.country}`,
        payment: o.payment_method,
        total: Number(o.total),
      })),
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold md:text-5xl">Orders</h1>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order, name, email, city…"
            className="w-64 border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <button
            type="button"
            onClick={exportCsv}
            className="label-xs border border-border px-4 py-2.5"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="hairline mt-8 flex flex-wrap gap-5 pb-4">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={
              s === filter
                ? "label-xs text-foreground underline underline-offset-4"
                : "label-xs text-muted-foreground hover:text-foreground"
            }
          >
            {s} ({countFor(s)})
          </button>
        ))}
      </div>

      <p className="label-xs mt-4 text-muted-foreground">
        Showing {visible.length} orders · {money(filteredRevenue)} value
      </p>


      <div className="mt-6 border border-border">
        {visible.map((o) => (
          <div key={o.id} className="border-b border-border last:border-b-0">
            <div className="flex flex-wrap items-center gap-4 px-4 py-3">
              <button
                type="button"
                onClick={() => setOpen(open === o.id ? null : o.id)}
                className="font-mono text-xs underline underline-offset-4"
              >
                {o.order_number}
              </button>
              <div className="min-w-40 flex-1">
                <p className="text-sm">{o.customer_name}</p>
                <p className="label-xs text-muted-foreground">{o.customer_email}</p>
              </div>
              <span className="label-xs text-muted-foreground">
                {o.payment_status === "paid"
                  ? "paid"
                  : o.payment_status === "awaiting_verification"
                    ? "check payment"
                    : o.payment_status === "payment_failed"
                      ? "not received"
                      : (o.payment_status ?? "unpaid")}
              </span>
              <span className="font-mono text-sm">{money(Number(o.total))}</span>
              <select
                value={o.status}
                onChange={(e) => updateStatus(o.id, e.target.value as Status)}
                className="border border-border bg-background px-2 py-2 text-xs"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {open === o.id && (
              <div className="grid gap-6 border-t border-border bg-surface px-4 py-5 md:grid-cols-2">
                <div>
                  <p className="label-xs text-muted-foreground">Items</p>
                  <div className="mt-3 space-y-2">
                    {(o.order_items ?? []).map(
                      (it: {
                        id: string;
                        product_name: string;
                        size: string;
                        quantity: number;
                        unit_price: number;
                      }) => (
                        <div key={it.id} className="flex justify-between text-sm">
                          <span>
                            {it.product_name} · {it.size} × {it.quantity}
                          </span>
                          <span className="font-mono">
                            {money(Number(it.unit_price) * it.quantity)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <p className="label-xs text-muted-foreground">Delivery</p>
                  <p className="mt-3 text-sm leading-relaxed">
                    {o.address_line}
                    <br />
                    {o.city} {o.postal_code}
                    <br />
                    {o.country}
                    <br />
                    {o.customer_phone}
                  </p>
                  {o.notes && (
                    <p className="label-xs mt-3 text-muted-foreground">Notes: {o.notes}</p>
                  )}
                  <p className="label-xs mt-3 text-muted-foreground">
                    Payment: {o.payment_method} · {o.payment_status ?? "unpaid"}
                  </p>
                  {o.payment_ref && (
                    <p className="label-xs mt-1 text-muted-foreground">
                      Reference:{" "}
                      <span className="font-mono text-foreground">{o.payment_ref}</span>
                    </p>
                  )}
                  {o.payment_status !== "paid" && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void setPayment(o.id, "paid")}
                        className="label-xs bg-primary px-4 py-2.5 text-primary-foreground"
                      >
                        Payment received
                      </button>
                      <button
                        type="button"
                        onClick={() => void setPayment(o.id, "payment_failed")}
                        className="label-xs border border-border px-4 py-2.5"
                      >
                        Not received
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {visible.length === 0 && (
          <p className="label-xs px-4 py-6 text-muted-foreground">No orders here.</p>
        )}
      </div>
    </div>
  );
}
