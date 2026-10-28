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

const groups = [
  { title: "Store", items: [
    { to: "/admin", label: "Overview", exact: true },
    { to: "/admin/products", label: "Products", exact: false },
    { to: "/admin/orders", label: "Orders", exact: false },
    { to: "/admin/delivery", label: "Delivery", exact: false },
    { to: "/admin/customers", label: "Customers", exact: false },
    { to: "/admin/custom", label: "Custom designs", exact: false },
  ] },
  { title: "Design", items: [
    { to: "/admin/studio", label: "Theme Studio", exact: false },
    { to: "/admin/theme", label: "Theme", exact: false },
    { to: "/admin/site-editor", label: "Site editor", exact: false },
    { to: "/admin/code-editor", label: "Code editor", exact: false },
  ] },
  { title: "Settings", items: [
    { to: "/admin/upi", label: "UPI IDs", exact: false },
    { to: "/admin/activity", label: "Activity log", exact: false },
  ] },
] as const;


function AdminLayout() {
  const { session, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  useLiveOrders();

  useEffect(() => {
    if (!session || !isAdmin) return;
    const key = `ch-logged-${session.user.id}-${session.expires_at ?? ""}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void supabase.from("activity_logs").insert({
      actor_id: session.user.id,
      actor_email: session.user.email ?? "",
      area: "admin",
      action: "sign in",
      summary: "Opened the admin dashboard",
      details: { browser: navigator.userAgent.slice(0, 200) },
    });
  }, [session, isAdmin]);

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
    <div className="min-h-screen bg-background md:flex">
      <aside className="border-b border-border bg-surface md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:overflow-y-auto md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-5 py-5">
          <Link to="/" className="text-base font-semibold">Comfort Hub</Link>
          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Admin</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {groups.map((g) => (
            <div key={g.title} className="flex gap-1 md:mb-4 md:flex-col">
              <p className="hidden px-3 pb-1 text-xs text-muted-foreground md:block">{g.title}</p>
              {g.items.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  activeOptions={{ exact: n.exact }}
                  className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  activeProps={{ className: "whitespace-nowrap rounded-md px-3 py-2 text-sm bg-accent text-foreground font-medium" }}
                >
                  {n.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="hidden border-t border-border px-5 py-4 md:block">
          <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
          <button type="button" onClick={() => supabase.auth.signOut()} className="mt-2 text-sm text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1 p-6 md:p-10">
        <Outlet />
      </div>
    </div>
  );
}
