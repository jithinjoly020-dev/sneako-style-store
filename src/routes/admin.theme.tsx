import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_THEME, themeQuery, useRefreshTheme, type StoreTheme, type ThemePalette } from "@/lib/theme";

export const Route = createFileRoute("/admin/theme")({
  head: () => ({ meta: [
    { title: "Theme Editor — unlabelled" },
    { name: "description", content: "Manage the unlabelled storefront appearance." },
    { property: "og:title", content: "Theme Editor — unlabelled" },
    { property: "og:description", content: "Manage the unlabelled storefront appearance." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ThemeEditor,
});

const colorFields: { key: keyof ThemePalette; label: string }[] = [
  { key: "background", label: "Page background" }, { key: "foreground", label: "Main text" },
  { key: "surface", label: "Cards & panels" }, { key: "muted", label: "Muted surface" },
  { key: "mutedForeground", label: "Muted text" }, { key: "border", label: "Borders" },
  { key: "primary", label: "Primary action" }, { key: "primaryForeground", label: "Action text" },
  { key: "destructive", label: "Error / delete" },
];

function ThemeEditor() {
  const { data } = useQuery(themeQuery);
  const refresh = useRefreshTheme();
  const [form, setForm] = useState<StoreTheme | null>(null);
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("dark");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data && !form) setForm(data); }, [data, form]);
  if (!form) return <p className="label-xs text-muted-foreground">Loading theme…</p>;

  const changed = JSON.stringify(form) !== JSON.stringify(data);
  const colors = form[previewMode];
  const setPalette = (key: keyof ThemePalette, value: string) => setForm({ ...form, [previewMode]: { ...colors, [key]: value } });
  async function save() {
    setSaving(true);
    const { error } = await supabase.from("custom_settings").update({ theme: form, updated_at: new Date().toISOString() }).eq("id", 1);
    setSaving(false);
    if (error) return void toast.error(error.message);
    await refresh();
    toast.success("Storefront theme published");
  }

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div><p className="label-xs text-muted-foreground">Storefront appearance</p><h1 className="mt-2 text-3xl font-semibold md:text-5xl">Theme editor</h1></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setForm(structuredClone(DEFAULT_THEME))}><RotateCcw />Restore defaults</Button>
          <Button onClick={save} disabled={!changed || saving}><Save />{saving ? "Publishing…" : "Save & publish"}</Button>
        </div>
      </div>

      <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-10">
          <section><h2 className="text-xl font-semibold">Customer preference</h2><p className="mt-1 text-sm text-muted-foreground">This is used until a customer chooses their own mode.</p>
            <Segmented values={["light", "dark", "system"]} value={form.defaultMode} onChange={(value) => setForm({ ...form, defaultMode: value as StoreTheme["defaultMode"] })} />
          </section>
          <section>
            <div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">Colours</h2><p className="mt-1 text-sm text-muted-foreground">Edit each customer mode separately.</p></div><Segmented values={["light", "dark"]} value={previewMode} onChange={(value) => setPreviewMode(value as "light" | "dark")} /></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {colorFields.map(({ key, label }) => <label key={key} className="border border-border bg-surface p-3 text-sm"><span className="mb-3 block text-muted-foreground">{label}</span><span className="flex items-center gap-3"><input type="color" value={colors[key]} onChange={(e) => setPalette(key, e.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer border-0 bg-transparent p-0" /><input value={colors[key]} onChange={(e) => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && setPalette(key, e.target.value.toUpperCase())} className="min-w-0 flex-1 bg-transparent font-mono text-xs outline-none" maxLength={7} /></span></label>)}
            </div>
          </section>
          <section className="grid gap-7 md:grid-cols-2"><SelectSetting label="Heading font" value={form.headingFont} values={["Archivo", "JetBrains Mono"]} onChange={(headingFont) => setForm({ ...form, headingFont: headingFont as StoreTheme["headingFont"] })} /><SelectSetting label="Body font" value={form.bodyFont} values={["Archivo", "JetBrains Mono"]} onChange={(bodyFont) => setForm({ ...form, bodyFont: bodyFont as StoreTheme["bodyFont"] })} /></section>
          <section className="grid gap-7 md:grid-cols-2"><div><h2 className="text-xl font-semibold">Corner style</h2><Segmented values={["square", "soft", "rounded"]} value={form.radius} onChange={(radius) => setForm({ ...form, radius: radius as StoreTheme["radius"] })} /></div><div><h2 className="text-xl font-semibold">Motion</h2><Segmented values={["full", "subtle", "off"]} value={form.motion} onChange={(motion) => setForm({ ...form, motion: motion as StoreTheme["motion"] })} /></div></section>
          <label className="flex items-center justify-between border-y border-border py-4"><span><strong className="block text-sm">Film grain</strong><span className="text-sm text-muted-foreground">Keep the editorial texture on visual areas.</span></span><input type="checkbox" checked={form.grain} onChange={(e) => setForm({ ...form, grain: e.target.checked })} className="size-5 accent-current" /></label>
        </div>

        <aside className="xl:sticky xl:top-8 xl:self-start"><p className="label-xs mb-3 text-muted-foreground">Live preview · {previewMode}</p><div className="overflow-hidden border p-5" style={{ background: colors.background, color: colors.foreground, borderColor: colors.border, borderRadius: form.radius === "square" ? 0 : form.radius === "soft" ? 4 : 10, fontFamily: form.bodyFont }}><div className="flex items-center justify-between border-b pb-4" style={{ borderColor: colors.border }}><strong style={{ fontFamily: form.headingFont }}>UNLABELLED.</strong><span className="text-xs" style={{ color: colors.mutedForeground }}>SHOP &nbsp; STUDIO</span></div><div className="py-12"><p className="text-xs uppercase" style={{ color: colors.mutedForeground }}>Heavyweight essentials</p><h3 className="mt-3 text-4xl font-semibold" style={{ fontFamily: form.headingFont }}>Built to hold<br />its shape.</h3><button type="button" className="mt-6 px-4 py-3 text-xs font-semibold uppercase" style={{ background: colors.primary, color: colors.primaryForeground, borderRadius: form.radius === "square" ? 0 : form.radius === "soft" ? 4 : 10 }}>Shop collection</button></div><div className="border p-4" style={{ background: colors.surface, borderColor: colors.border, borderRadius: form.radius === "square" ? 0 : form.radius === "soft" ? 4 : 10 }}><div className="aspect-[4/3]" style={{ background: colors.muted }} /><p className="mt-3 text-sm font-medium">MONOLITH TEE</p><p className="mt-1 text-xs" style={{ color: colors.mutedForeground }}>₹1,499 · 240 GSM</p></div></div>{changed && <p className="mt-3 text-xs text-muted-foreground">You have unpublished changes.</p>}</aside>
      </div>
    </div>
  );
}

function Segmented({ values, value, onChange }: { values: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="mt-3 inline-flex border border-border bg-surface p-1">{values.map((item) => <Button key={item} type="button" size="sm" variant={item === value ? "default" : "ghost"} onClick={() => onChange(item)} className="capitalize shadow-none">{item}</Button>)}</div>;
}
function SelectSetting({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return <label><span className="text-xl font-semibold">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="mt-3 block w-full border border-border bg-background px-3 py-3 text-sm">{values.map((item) => <option key={item}>{item}</option>)}</select></label>;
}