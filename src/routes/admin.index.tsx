import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { productsQuery } from "@/lib/products";
import { money } from "@/lib/cart";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

type OrderItem = { id: string; product_name: string; quantity: number; unit_price: number };
type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  total: number;
  created_at: string;
  order_items?: OrderItem[];
};

const ordersQuery = {
  queryKey: ["admin-orders"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Order[];
  },
};

const DAY = 86_400_000;

function AdminOverview() {
  const { data: products = [] } = useQuery(productsQuery);
  const { data: orders = [] } = useQuery(ordersQuery);

  const paid = orders.filter((o) => o.status !== "cancelled");
  const revenue = paid.reduce((n, o) => n + Number(o.total), 0);
  const pending = orders.filter((o) => o.status === "pending").length;
  const lowStock = products.filter((p) => p.stock < 20);
  const now = Date.now();
  const last7 = paid.filter((o) => now - new Date(o.created_at).getTime() < 7 * DAY);
  const prev7 = paid.filter((o) => {
    const age = now - new Date(o.created_at).getTime();
    return age >= 7 * DAY && age < 14 * DAY;
  });
  const rev7 = last7.reduce((n, o) => n + Number(o.total), 0);
  const revPrev7 = prev7.reduce((n, o) => n + Number(o.total), 0);
  const growth = revPrev7 > 0 ? Math.round(((rev7 - revPrev7) / revPrev7) * 100) : null;
  const aov = paid.length ? revenue / paid.length : 0;
  const unitsSold = paid
    .flatMap((o) => o.order_items ?? [])
    .reduce((n, it) => n + it.quantity, 0);
  const inventoryValue = products.reduce((n, p) => n + Number(p.price) * p.stock, 0);

  const topProducts = Object.values(
    paid
      .flatMap((o) => o.order_items ?? [])
      .reduce<Record<string, { name: string; qty: number; revenue: number }>>((acc, it) => {
        const row = acc[it.product_name] ?? { name: it.product_name, qty: 0, revenue: 0 };
        row.qty += it.quantity;
        row.revenue += Number(it.unit_price) * it.quantity;
        acc[it.product_name] = row;
        return acc;
      }, {}),
  )
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const repeatCustomers = Object.values(
    paid.reduce<Record<string, number>>((acc, o) => {
      acc[o.customer_email] = (acc[o.customer_email] ?? 0) + 1;
      return acc;
    }, {}),
  ).filter((n) => n > 1).length;

  const stats = [
    { k: "Revenue", v: money(revenue) },
    { k: "Last 7 days", v: money(rev7), sub: growth === null ? "no prior data" : `${growth > 0 ? "+" : ""}${growth}% vs prev week` },
    { k: "Orders", v: String(orders.length) },
    { k: "Pending", v: String(pending) },
    { k: "Avg order", v: money(aov) },
    { k: "Units sold", v: String(unitsSold) },
    { k: "Stock value", v: money(inventoryValue) },
    { k: "Repeat buyers", v: String(repeatCustomers) },
  ];

  const byStatus = ["pending", "confirmed", "shipped", "delivered", "cancelled"].map((s) => ({
    s,
    n: orders.filter((o) => o.status === s).length,
  }));
  const maxStatus = Math.max(1, ...byStatus.map((b) => b.n));

  return (
    <div>
      <h1 className="text-3xl font-semibold md:text-5xl">Overview</h1>

      <div className="mt-8 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.k} className="bg-surface p-6">
            <p className="label-xs text-muted-foreground">{s.k}</p>
            <p className="mt-3 font-mono text-2xl">{s.v}</p>
            {s.sub && <p className="label-xs mt-2 text-muted-foreground">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="hairline pb-4 text-xl font-semibold">Order pipeline</h2>
          <div className="mt-4 space-y-3">
            {byStatus.map((b) => (
              <div key={b.s} className="flex items-center gap-4">
                <span className="label-xs w-24 text-muted-foreground">{b.s}</span>
                <div className="h-2 flex-1 bg-muted">
                  <div
                    className="h-2 bg-foreground transition-all duration-700"
                    style={{ width: `${(b.n / maxStatus) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-xs">{b.n}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="hairline pb-4 text-xl font-semibold">Best sellers</h2>
          <div className="mt-4 border border-border">
            {topProducts.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="text-sm">{p.name}</span>
                <span className="label-xs text-muted-foreground">{p.qty} sold</span>
                <span className="font-mono text-sm">{money(p.revenue)}</span>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="label-xs px-4 py-6 text-muted-foreground">No sales yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div>
          <div className="hairline flex items-end justify-between pb-4">
            <h2 className="text-xl font-semibold">Low stock alerts</h2>
            <Link to="/admin/products" className="label-xs text-muted-foreground">
              Restock
            </Link>
          </div>
          <div className="mt-4 border border-border">
            {lowStock.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="text-sm">{p.name}</span>
                <span className="label-xs text-destructive">{p.stock} left</span>
              </div>
            ))}
            {lowStock.length === 0 && (
              <p className="label-xs px-4 py-6 text-muted-foreground">Everything well stocked.</p>
            )}
          </div>
        </div>

        <div>
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
    </div>
  );
}
