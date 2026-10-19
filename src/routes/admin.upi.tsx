import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { upiAccountsQuery, type UpiAccount } from "@/lib/upi";

export const Route = createFileRoute("/admin/upi")({
  component: AdminUpi,
});

const empty = { label: "", upi_id: "", payee_name: "Comfort Hub", sort_order: "0" };
type FormState = typeof empty;

function AdminUpi() {
  const { data: accounts = [], isLoading } = useQuery(upiAccountsQuery);
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["upi-accounts"] });

  function edit(a: UpiAccount) {
    setEditing(a.id);
    setForm({
      label: a.label,
      upi_id: a.upi_id,
      payee_name: a.payee_name,
      sort_order: String(a.sort_order),
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const upi = form.upi_id.trim();
    if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi)) {
      toast.error("Enter a valid UPI ID, e.g. name@bank");
      return;
    }
    setSaving(true);
    const payload = {
      label: form.label.trim() || upi,
      upi_id: upi,
      payee_name: form.payee_name.trim() || "Comfort Hub",
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await supabase.from("upi_accounts").update(payload).eq("id", editing)
      : await supabase.from("upi_accounts").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "UPI ID updated" : "UPI ID added");
    setForm(empty);
    setEditing(null);
    void refresh();
  }

  async function toggleActive(a: UpiAccount) {
    const { error } = await supabase
      .from("upi_accounts")
      .update({ is_active: !a.is_active })
      .eq("id", a.id);
    if (error) toast.error(error.message);
    else void refresh();
  }

  async function makeDefault(a: UpiAccount) {
    await supabase.from("upi_accounts").update({ is_default: false }).neq("id", a.id);
    const { error } = await supabase
      .from("upi_accounts")
      .update({ is_default: true, is_active: true })
      .eq("id", a.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${a.upi_id} is now the default`);
      void refresh();
    }
  }

  async function remove(a: UpiAccount) {
    if (!confirm(`Remove ${a.upi_id}?`)) return;
    const { error } = await supabase.from("upi_accounts").delete().eq("id", a.id);
    if (error) toast.error(error.message);
    else void refresh();
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-semibold">UPI IDs</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add the UPI IDs customers can pay to. Active IDs appear at checkout; the default one is
        pre-selected.
      </p>

      <form onSubmit={save} className="mt-8 grid gap-4 border border-border bg-surface p-5 md:grid-cols-2">
        <div>
          <label htmlFor="label" className="label-xs text-muted-foreground">
            Name / bank
          </label>
          <input
            id="label"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="e.g. HDFC — main"
            className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label htmlFor="upi_id" className="label-xs text-muted-foreground">
            UPI ID
          </label>
          <input
            id="upi_id"
            value={form.upi_id}
            onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
            placeholder="name@bank"
            className="mt-2 w-full border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label htmlFor="payee_name" className="label-xs text-muted-foreground">
            Payee name shown in the UPI app
          </label>
          <input
            id="payee_name"
            value={form.payee_name}
            onChange={(e) => setForm({ ...form, payee_name: e.target.value })}
            className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label htmlFor="sort_order" className="label-xs text-muted-foreground">
            Order
          </label>
          <input
            id="sort_order"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>
        <div className="flex gap-3 md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary px-5 py-2.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Add UPI ID"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(empty);
              }}
              className="label-xs border border-border px-4"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-8 space-y-3">
        {isLoading && <p className="label-xs text-muted-foreground">Loading…</p>}
        {!isLoading && accounts.length === 0 && (
          <p className="label-xs text-muted-foreground">No UPI IDs yet.</p>
        )}
        {accounts.map((a) => (
          <div
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-4 border border-border bg-surface p-4"
          >
            <div>
              <p className="font-mono text-sm">{a.upi_id}</p>
              <p className="label-xs text-muted-foreground">
                {a.label || "—"} · {a.payee_name}
                {a.is_default ? " · default" : ""}
                {a.is_active ? "" : " · hidden"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => edit(a)} className="label-xs border border-border px-3 py-1.5">
                Edit
              </button>
              <button
                type="button"
                onClick={() => void toggleActive(a)}
                className="label-xs border border-border px-3 py-1.5"
              >
                {a.is_active ? "Hide" : "Show"}
              </button>
              {!a.is_default && (
                <button
                  type="button"
                  onClick={() => void makeDefault(a)}
                  className="label-xs border border-border px-3 py-1.5"
                >
                  Make default
                </button>
              )}
              <button
                type="button"
                onClick={() => void remove(a)}
                className="label-xs border border-border px-3 py-1.5 text-destructive"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
