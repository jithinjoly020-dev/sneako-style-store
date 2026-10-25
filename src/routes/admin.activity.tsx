import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv } from "@/lib/export-csv";

export const Route = createFileRoute("/admin/activity")({
  component: ActivityLog,
});

type Log = {
  id: string;
  actor_email: string;
  area: string;
  action: string;
  record_id: string;
  summary: string;
  details: unknown;
  created_at: string;
};

const areaNames: Record<string, string> = {
  orders: "Orders",
  products: "Products",
  order_events: "Delivery updates",
  custom_orders: "Custom designs",
  custom_settings: "Settings / theme / site",
  upi_accounts: "UPI IDs",
  user_roles: "Staff access",
  admin: "Admin sign-in",
};

function ActivityLog() {
  const [area, setArea] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const { data: logs = [], refetch, isFetching } = useQuery({
    queryKey: ["activity", area],
    queryFn: async (): Promise<Log[]> => {
      let req = supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (area !== "all") req = req.eq("area", area);
      const { data, error } = await req;
      if (error) throw error;
      return (data ?? []) as Log[];
    },
    refetchInterval: 15000,
  });

  const term = q.trim().toLowerCase();
  const visible = logs.filter(
    (l) =>
      !term ||
      `${l.summary} ${l.actor_email} ${l.action} ${JSON.stringify(l.details)}`
        .toLowerCase()
        .includes(term),
  );

  return (
    <div>
      <h1 className="text-3xl font-semibold md:text-5xl">Activity log</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Every order, product, delivery, custom design, UPI, settings and staff change — recorded
        automatically with who did it and when.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search activity…"
          className="w-56 border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="border border-border bg-background px-3 py-2 text-xs"
        >
          <option value="all">All areas</option>
          {Object.entries(areaNames).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => refetch()} className="label-xs border border-border px-4 py-2.5">
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
        <button
          type="button"
          onClick={() =>
            downloadCsv(
              `activity-${new Date().toISOString().slice(0, 10)}.csv`,
              visible.map((l) => ({
                time: new Date(l.created_at).toLocaleString("en-IN"),
                who: l.actor_email || "Customer / system",
                area: areaNames[l.area] ?? l.area,
                action: l.action,
                item: l.summary,
                details: JSON.stringify(l.details),
              })),
            )
          }
          className="label-xs border border-border px-4 py-2.5"
        >
          Export CSV
        </button>
        <span className="label-xs text-muted-foreground">{visible.length} entries</span>
      </div>

      <div className="mt-5 border border-border">
        {visible.map((l) => (
          <div key={l.id} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => setOpen(open === l.id ? null : l.id)}
              className="flex w-full flex-wrap items-center gap-4 px-4 py-3 text-left hover:bg-muted"
            >
              <span className="label-xs w-40 text-muted-foreground">
                {new Date(l.created_at).toLocaleString("en-IN")}
              </span>
              <span className="label-xs w-36">{areaNames[l.area] ?? l.area}</span>
              <span className="label-xs w-20 uppercase">{l.action}</span>
              <span className="min-w-32 flex-1 text-sm">{l.summary}</span>
              <span className="label-xs text-muted-foreground">
                {l.actor_email || "Customer / system"}
              </span>
            </button>
            {open === l.id && (
              <pre className="overflow-x-auto bg-surface px-4 py-3 font-mono text-xs text-muted-foreground">
                {JSON.stringify(l.details, null, 2)}
              </pre>
            )}
          </div>
        ))}
        {visible.length === 0 && (
          <p className="label-xs px-4 py-6 text-muted-foreground">No activity yet.</p>
        )}
      </div>
    </div>
  );
}
