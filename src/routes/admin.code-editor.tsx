import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Save, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { normalizeSiteContent, siteContentQuery, useRefreshSiteContent, type PageCode, type SiteContent } from "@/lib/site-content";

export const Route = createFileRoute("/admin/code-editor")({
  head: () => ({ meta: [
    { title: "Code Editor — Comfort Hub" },
    { name: "description", content: "Add custom CSS, HTML and scripts to storefront pages." },
    { property: "og:title", content: "Code Editor — Comfort Hub" },
    { property: "og:description", content: "Add custom CSS, HTML and scripts to storefront pages." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: CodeEditor,
});

const targets = [
  ["global", "All pages"], ["/", "Home"], ["/shop", "Shop"], ["/about", "Studio"], ["/custom", "Custom"],
  ["/contact", "Contact"], ["/cart", "Cart"], ["/checkout", "Checkout"],
] as const;
const tabs = [["css", "CSS"], ["html", "HTML"], ["js", "JavaScript"]] as const;
const empty: PageCode = { css: "", html: "", js: "" };

function CodeEditor() {
  const { data } = useQuery(siteContentQuery);
  const refresh = useRefreshSiteContent();
  const [form, setForm] = useState<SiteContent | null>(null);
  const [target, setTarget] = useState<string>("global");
  const [tab, setTab] = useState<keyof PageCode>("css");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data && !form) setForm(data); }, [data, form]);
  if (!form) return <p className="label-xs text-muted-foreground">Loading code editor…</p>;
  const current = form.code[target] ?? empty;
  const changed = JSON.stringify(form.code) !== JSON.stringify(data?.code ?? {});

  async function save() {
    // Re-read latest so text/background edits made elsewhere aren't overwritten.
    setSaving(true);
    const { data: latest } = await supabase.from("custom_settings").select("site_content").eq("id", 1).maybeSingle();
    const merged = normalizeSiteContent({ ...normalizeSiteContent(latest?.site_content), code: form!.code });
    const { error } = await supabase.from("custom_settings").update({ site_content: merged, updated_at: new Date().toISOString() }).eq("id", 1);
    setSaving(false);
    if (error) return void toast.error(error.message);
    setForm(merged);
    await refresh();
    toast.success("Code published");
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="label-xs text-muted-foreground">Advanced</p><h1 className="text-3xl font-semibold">Code editor</h1></div>
      <Button onClick={save} disabled={!changed || saving}><Save />{saving ? "Publishing…" : "Publish"}</Button>
    </div>
    <div className="flex gap-3 border border-border bg-surface p-4 text-sm"><TriangleAlert className="size-5 shrink-0" /><p>Code here runs on the live shop for every visitor. A mistake can break pages — clear the box and publish to undo. Admin pages are never affected, so you can always come back.</p></div>
    <div className="flex flex-wrap gap-2">{targets.map(([key, label]) => <Button key={key} size="sm" variant={target === key ? "default" : "outline"} onClick={() => setTarget(key)}>{label}{form.code[key] ? " •" : ""}</Button>)}</div>
    <div className="flex gap-2 border-b border-border">{tabs.map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`label-xs px-3 py-2 ${tab === key ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground"}`}>{label}</button>)}</div>
    <textarea spellCheck={false} value={current[tab]} maxLength={100000}
      placeholder={tab === "css" ? ".site-header { background: black; }" : tab === "html" ? "<section>Your custom block (shown at the bottom of the page)</section>" : "console.log('Hello from Comfort Hub')"}
      onChange={(e) => setForm({ ...form, code: { ...form.code, [target]: { ...current, [tab]: e.target.value } } })}
      onKeyDown={(e) => { if (e.key === "Tab") { e.preventDefault(); const t = e.currentTarget; const s = t.selectionStart; t.setRangeText("  ", s, t.selectionEnd, "end"); setForm({ ...form, code: { ...form.code, [target]: { ...current, [tab]: t.value } } }); } }}
      className="h-[60vh] w-full resize-y border border-border bg-card p-4 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring" />
    <p className="text-xs text-muted-foreground">{changed ? "Unpublished changes" : "Published"} · "All pages" code loads first, then the page's own code.</p>
  </div>;
}
