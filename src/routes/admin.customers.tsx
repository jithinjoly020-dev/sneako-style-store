import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/cart";
import { downloadCsv } from "@/lib/export-csv";

export const Route = createFileRoute("/admin/customers")({
  component: AdminCustomers,
});

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  city: string;
  status: string;
  total: number;
  created_at: string;
};

const customersQuery = {
  queryKey: ["admin-customers"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, customer_name, customer_email, customer_phone, city, status, total, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Order[];
  },
};

function AdminCustomers() {
  const { data: orders = [] } = useQuery(customersQuery);
  const [q, setQ] = useState("");

  const grouped = Object.values(
    orders.reduce<
      Record<
        string,
        {
          email: string;
          name: string;
          phone: string;
          city: string;
          orders: number;
          spend: number;
          last: string;
        }
      >
    >((acc, o) => {
      const row =
        acc[o.customer_email] ??
        {
          email: o.customer_email,
          name: o.customer_name,
          phone: o.customer_phone,
          city: o.city,
          orders: 0,
          spend: 0,
          last: o.created_at,
        };
      row.orders += 1;
      if (o.status !== "cancelled") row.spend += Number(o.total);
      if (new Date(o.created_at) > new Date(row.last)) row.last = o.created_at;
      acc[o.customer_email] = row;
      return acc;
    }, {}),
  ).sort((a, b) => b.spend - a.spend);

  const term = q.trim().toLowerCase();
  const visible = grouped.filter(
    (c) => !term || `${c.name} ${c.email} ${c.phone} ${c.city}`.toLowerCase().includes(term),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold md:text-5xl">Customers</h1>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customers…"
            className="w-56 border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `customers-${new Date().toISOString().slice(0, 10)}.csv`,
                visible.map((c) => ({
                  name: c.name,
                  email: c.email,
                  phone: c.phone,
                  city: c.city,
                  orders: c.orders,
                  lifetime_value: c.spend,
                  last_order: new Date(c.last).toLocaleDateString(),
                })),
              )
            }
            className="label-xs border border-border px-4 py-2.5"
          >
            Export CSV
          </button>
        </div>
      </div>

      <p className="label-xs mt-6 text-muted-foreground">
        {visible.length} customers · {visible.filter((c) => c.orders > 1).length} repeat buyers
      </p>

      <div className="mt-5 border border-border">
        {visible.map((c) => (
          <div
            key={c.email}
            className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
          >
            <div className="min-w-48 flex-1">
              <p className="text-sm font-medium">{c.name}</p>
              <p className="label-xs text-muted-foreground">{c.email}</p>
            </div>
            <span className="label-xs text-muted-foreground">{c.city}</span>
            <span className="label-xs w-20 text-muted-foreground">{c.orders} orders</span>
            <span className="font-mono text-sm">{money(c.spend)}</span>
            <span className="label-xs w-28 text-right text-muted-foreground">
              {new Date(c.last).toLocaleDateString()}
            </span>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="label-xs px-4 py-6 text-muted-foreground">No customers yet.</p>
        )}
      </div>
    </div>
  );
}
