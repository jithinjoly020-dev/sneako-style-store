import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { productsQuery } from "@/lib/products";
import { money } from "@/lib/cart";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

const ordersQuery = {
  queryKey: ["admin-orders"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

function AdminOverview() {
  const { data: products = [] } = useQuery(productsQuery);
  const { data: orders = [] } = useQuery(ordersQuery);

  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((n, o) => n + Number(o.total), 0);
  const pending = orders.filter((o) => o.status === "pending").length;
  const lowStock = products.filter((p) => p.stock < 20).length;

  const stats = [
    { k: "Revenue", v: money(revenue) },
    { k: "Orders", v: String(orders.length) },
    { k: "Pending", v: String(pending) },
    { k: "Low stock", v: String(lowStock) },
  ];

  return (
    <div>
      <h1 className="text-3xl font-semibold md:text-5xl">Overview</h1>

      <div className="mt-8 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.k} className="bg-surface p-6">
            <p className="label-xs text-muted-foreground">{s.k}</p>
            <p className="mt-3 font-mono text-2xl">{s.v}</p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <div className="hairline flex items-end justify-between pb-4">
          <h2 className="text-xl font-semibold">Latest orders</h2>
          <Link to="/admin/orders" className="label-xs text-muted-foreground">
            View all
          </Link>
        </div>
        <div className="mt-4 border border-border">
          {orders.slice(0, 6).map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span className="font-mono text-xs">{o.order_number}</span>
              <span className="text-sm">{o.customer_name}</span>
              <span className="label-xs text-muted-foreground">{o.status}</span>
              <span className="font-mono text-sm">{money(Number(o.total))}</span>
            </div>
          ))}
          {orders.length === 0 && (
            <p className="label-xs px-4 py-6 text-muted-foreground">No orders yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
