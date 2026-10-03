import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, RotateCcw, Save, Sparkles } from "lucide-react";
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
  { key: "accent", label: "Accent surface" }, { key: "selection", label: "Text selection" },
  { key: "ring", label: "Focus ring" },
];

const presets: { name: string; description: string; theme: StoreTheme }[] = [
  { name: "Editorial Mono", description: "The original stark black-and-bone studio look.", theme: DEFAULT_THEME },
  { name: "Gallery Light", description: "Bright retail gallery with softer structure.", theme: { ...DEFAULT_THEME, defaultMode: "light", radius: "soft", motion: "subtle", grain: false, density: "airy", shadow: "soft", light: { ...DEFAULT_THEME.light, background: "#FAFAF8", surface: "#FFFFFF", accent: "#ECECE7", selection: "#D8E9FF", ring: "#225EA8" } } },
  { name: "Signal", description: "Bold campaign styling with a sharper red accent.", theme: { ...DEFAULT_THEME, dark: { ...DEFAULT_THEME.dark, primary: "#FF4B3E", primaryForeground: "#141414", accent: "#3D2422", selection: "#71302B", ring: "#FF7167" }, headingWeight: "bold", headingStyle: "tight", buttonStyle: "solid", shadow: "strong" } },
];

function ThemeEditor() {
  const { data } = useQuery(themeQuery);
  const refresh = useRefreshTheme();
  const [form, setForm] = useState<StoreTheme | null>(null);
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("dark");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data && !form) setForm(data); }, [data, form]);
  if (!form) return <p className="label-xs text-muted-foreground">Loading theme…</p>;

  const changed = Boolean(data) && JSON.stringify(form) !== JSON.stringify(data);
  const colors = form[previewMode];
  const setPalette = (key: keyof ThemePalette, value: string) => setForm({ ...form, [previewMode]: { ...colors, [key]: value } });
  const applyPreset = (preset: StoreTheme) => {
    if (changed && !window.confirm("Replace your unpublished theme changes with this preset?")) return;
    setForm(structuredClone(preset));
  };
  async function save() {
    setSaving(true);
    const { error } = await supabase.from("custom_settings").update({ theme: form, updated_at: new Date().toISOString() }).eq("id", 1);
    setSaving(false);
    if (error) return void toast.error(error.message);
    await refresh();
    setForm(form);
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
          <section><div className="flex items-center gap-2"><Sparkles className="size-5" /><h2 className="text-xl font-semibold">Theme presets</h2></div><p className="mt-1 text-sm text-muted-foreground">Start with a complete direction, then refine every detail.</p><div className="mt-4 grid gap-3 md:grid-cols-3">{presets.map((preset) => <button key={preset.name} type="button" onClick={() => applyPreset(preset.theme)} className="theme-surface border border-border bg-surface p-4 text-left transition-colors hover:bg-accent"><strong className="flex items-center justify-between text-sm">{preset.name}<Check className="size-4 opacity-40" /></strong><span className="mt-2 block text-xs text-muted-foreground">{preset.description}</span></button>)}</div></section>
          <section><h2 className="text-xl font-semibold">Customer preference</h2><p className="mt-1 text-sm text-muted-foreground">This is used until a customer chooses their own mode.</p>
            <Segmented values={["light", "dark", "system"]} value={form.defaultMode} onChange={(value) => setForm({ ...form, defaultMode: value as StoreTheme["defaultMode"] })} />
          </section>
          <section>
            <div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">Colours</h2><p className="mt-1 text-sm text-muted-foreground">Edit each customer mode separately.</p></div><Segmented values={["light", "dark"]} value={previewMode} onChange={(value) => setPreviewMode(value as "light" | "dark")} /></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {colorFields.map(({ key, label }) => <label key={key} className="border border-border bg-surface p-3 text-sm"><span className="mb-3 block text-muted-foreground">{label}</span><span className="flex items-center gap-3"><input type="color" value={colors[key]} onChange={(e) => setPalette(key, e.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer border-0 bg-transparent p-0" /><input value={colors[key]} onChange={(e) => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && setPalette(key, e.target.value.toUpperCase())} className="min-w-0 flex-1 bg-transparent font-mono text-xs outline-none" maxLength={7} /></span></label>)}
            </div>
          </section>
          <section><h2 className="text-xl font-semibold">Typography</h2><div className="mt-4 grid gap-7 md:grid-cols-2"><SelectSetting label="Heading font" value={form.headingFont} values={["Archivo", "JetBrains Mono"]} onChange={(headingFont) => setForm({ ...form, headingFont: headingFont as StoreTheme["headingFont"] })} /><SelectSetting label="Body font" value={form.bodyFont} values={["Archivo", "JetBrains Mono"]} onChange={(bodyFont) => setForm({ ...form, bodyFont: bodyFont as StoreTheme["bodyFont"] })} /><SelectSetting label="Heading weight" value={form.headingWeight} values={["medium", "semibold", "bold"]} onChange={(headingWeight) => setForm({ ...form, headingWeight: headingWeight as StoreTheme["headingWeight"] })} /><SelectSetting label="Body size" value={form.bodyScale} values={["compact", "standard", "large"]} onChange={(bodyScale) => setForm({ ...form, bodyScale: bodyScale as StoreTheme["bodyScale"] })} /><SelectSetting label="Heading style" value={form.headingStyle} values={["tight", "editorial", "mono"]} onChange={(headingStyle) => setForm({ ...form, headingStyle: headingStyle as StoreTheme["headingStyle"] })} /><SelectSetting label="Label spacing" value={form.labelSpacing} values={["tight", "standard", "wide"]} onChange={(labelSpacing) => setForm({ ...form, labelSpacing: labelSpacing as StoreTheme["labelSpacing"] })} /></div></section>
          <section><h2 className="text-xl font-semibold">Layout & commerce</h2><div className="mt-4 grid gap-7 md:grid-cols-2"><SelectSetting label="Store width" value={form.containerWidth} values={["compact", "standard", "wide"]} onChange={(containerWidth) => setForm({ ...form, containerWidth: containerWidth as StoreTheme["containerWidth"] })} /><SelectSetting label="Content density" value={form.density} values={["compact", "comfortable", "airy"]} onChange={(density) => setForm({ ...form, density: density as StoreTheme["density"] })} /><SelectSetting label="Header treatment" value={form.headerStyle} values={["solid", "glass", "borderless"]} onChange={(headerStyle) => setForm({ ...form, headerStyle: headerStyle as StoreTheme["headerStyle"] })} /><SelectSetting label="Product image shape" value={form.productRatio} values={["portrait", "square", "landscape"]} onChange={(productRatio) => setForm({ ...form, productRatio: productRatio as StoreTheme["productRatio"] })} /><SelectSetting label="Button style" value={form.buttonStyle} values={["solid", "outline", "soft"]} onChange={(buttonStyle) => setForm({ ...form, buttonStyle: buttonStyle as StoreTheme["buttonStyle"] })} /><SelectSetting label="Shadow strength" value={form.shadow} values={["none", "soft", "strong"]} onChange={(shadow) => setForm({ ...form, shadow: shadow as StoreTheme["shadow"] })} /></div></section>
          <section className="grid gap-7 md:grid-cols-2"><div><h2 className="text-xl font-semibold">Corner style</h2><Segmented values={["square", "soft", "rounded"]} value={form.radius} onChange={(radius) => setForm({ ...form, radius: radius as StoreTheme["radius"] })} /></div><div><h2 className="text-xl font-semibold">Motion</h2><Segmented values={["full", "subtle", "off"]} value={form.motion} onChange={(motion) => setForm({ ...form, motion: motion as StoreTheme["motion"] })} /></div></section>
          <label className="flex items-center justify-between border-y border-border py-4"><span><strong className="block text-sm">Film grain</strong><span className="text-sm text-muted-foreground">Keep the editorial texture on visual areas.</span></span><input type="checkbox" checked={form.grain} onChange={(e) => setForm({ ...form, grain: e.target.checked })} className="size-5 accent-current" /></label>
        </div>

        <aside className="xl:sticky xl:top-8 xl:self-start"><p className="label-xs mb-3 text-muted-foreground">Live preview · {previewMode}</p><ThemePreview form={form} mode={previewMode} />{changed && <p className="mt-3 text-xs text-muted-foreground">You have unpublished changes.</p>}</aside>
      </div>
    </div>
  );
}

function ThemePreview({ form, mode }: { form: StoreTheme; mode: "light" | "dark" }) {
  const c = form[mode];
  const radius = form.radius === "square" ? 0 : form.radius === "soft" ? 4 : 10;
  const ratio = form.productRatio === "square" ? "1 / 1" : form.productRatio === "landscape" ? "4 / 3" : "4 / 5";
  const shadow = form.shadow === "none" ? "none" : form.shadow === "soft" ? `0 14px 34px ${c.border}` : `0 22px 55px ${c.mutedForeground}`;
  const button = form.buttonStyle === "outline" ? { background: "transparent", color: c.foreground, border: `1px solid ${c.primary}` } : form.buttonStyle === "soft" ? { background: c.accent, color: c.foreground, border: "1px solid transparent" } : { background: c.primary, color: c.primaryForeground, border: "1px solid transparent" };
  return <div className="overflow-hidden border p-5" style={{ background: c.background, color: c.foreground, borderColor: c.border, borderRadius: radius, fontFamily: form.bodyFont, fontSize: form.bodyScale === "compact" ? 13 : form.bodyScale === "large" ? 16 : 14 }}><div className="flex items-center justify-between border-b pb-4" style={{ borderColor: form.headerStyle === "borderless" ? "transparent" : c.border }}><strong style={{ fontFamily: form.headingStyle === "mono" ? "JetBrains Mono" : form.headingFont, fontWeight: form.headingWeight === "medium" ? 500 : form.headingWeight === "bold" ? 700 : 600 }}>UNLABELLED.</strong><span className="text-xs" style={{ color: c.mutedForeground, letterSpacing: form.labelSpacing === "tight" ? ".08em" : form.labelSpacing === "wide" ? ".24em" : ".16em" }}>SHOP &nbsp; STUDIO</span></div><div className={form.density === "compact" ? "py-7" : form.density === "airy" ? "py-16" : "py-11"}><p className="text-xs uppercase" style={{ color: c.mutedForeground }}>Heavyweight essentials</p><h3 className="mt-3 text-4xl" style={{ fontFamily: form.headingStyle === "mono" ? "JetBrains Mono" : form.headingFont, fontWeight: form.headingWeight === "medium" ? 500 : form.headingWeight === "bold" ? 700 : 600, letterSpacing: form.headingStyle === "tight" ? "-.03em" : "0" }}>Built to hold<br />its shape.</h3><span className="mt-6 inline-block px-4 py-3 text-xs font-semibold uppercase" style={{ ...button, borderRadius: radius }}>Shop collection</span></div><div className="border p-4" style={{ background: c.surface, borderColor: c.border, borderRadius: radius, boxShadow: shadow }}><div style={{ aspectRatio: ratio, background: c.muted }} /><div className="flex items-end justify-between gap-3"><div><p className="mt-3 text-sm font-medium">MONOLITH TEE</p><p className="mt-1 text-xs" style={{ color: c.mutedForeground }}>240 GSM · Black</p></div><p className="text-sm">₹1,499</p></div></div></div>;
}

function Segmented({ values, value, onChange }: { values: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="mt-3 inline-flex border border-border bg-surface p-1">{values.map((item) => <Button key={item} type="button" size="sm" variant={item === value ? "default" : "ghost"} onClick={() => onChange(item)} className="capitalize shadow-none">{item}</Button>)}</div>;
}
function SelectSetting({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return <label><span className="text-xl font-semibold">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="mt-3 block w-full border border-border bg-background px-3 py-3 text-sm">{values.map((item) => <option key={item}>{item}</option>)}</select></label>;
}