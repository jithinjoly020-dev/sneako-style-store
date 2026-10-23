import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLiveOrders } from "@/lib/live";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Comfort Hub" },
      { name: "description", content: "Manage Comfort Hub products, orders and stock." },
      { property: "og:title", content: "Admin — Comfort Hub" },
      { property: "og:description", content: "Manage Comfort Hub products, orders and stock." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/products", label: "Products", exact: false },
  { to: "/admin/orders", label: "Orders", exact: false },
  { to: "/admin/delivery", label: "Delivery", exact: false },
  { to: "/admin/customers", label: "Customers", exact: false },
  { to: "/admin/custom", label: "Custom designs", exact: false },
  { to: "/admin/upi", label: "UPI IDs", exact: false },
  { to: "/admin/theme", label: "Theme", exact: false },
  { to: "/admin/site-editor", label: "Site editor", exact: false },
  { to: "/admin/code-editor", label: "Code editor", exact: false },
] as const;


function AdminLayout() {
  const { session, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  useLiveOrders();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return <p className="label-xs px-6 py-20 text-muted-foreground">Checking access…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24">
        <h1 className="text-2xl font-semibold">No admin access</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This account ({session.user.email}) isn't an admin yet. An existing admin needs to grant
          the admin role to this user before the dashboard unlocks.
        </p>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="label-xs mt-8 border border-border px-4 py-2"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-border bg-surface p-6 md:min-h-screen md:w-60 md:border-r md:border-b-0">
        <Link to="/" className="font-display text-lg font-semibold tracking-[-0.04em]">
          COMFORT HUB
        </Link>
        <p className="label-xs mt-1 text-muted-foreground">Admin</p>
        <nav className="mt-8 flex gap-5 md:flex-col md:gap-3">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact }}
              className="label-xs text-muted-foreground hover:text-foreground"
              activeProps={{ className: "label-xs text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="label-xs mt-10 text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </aside>
      <div className="flex-1 p-6 md:p-10">
        <Outlet />
      </div>
    </div>
  );
}
