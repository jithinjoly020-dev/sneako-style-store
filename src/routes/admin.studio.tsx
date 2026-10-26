import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ImagePlus, Monitor, Moon, Paintbrush, RotateCcw, Save, Smartphone, Sun, Tablet, Trash2, Type } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_THEME, themeQuery, useRefreshTheme, type StoreTheme, type ThemePalette } from "@/lib/theme";
import { normalizeSiteContent, siteContentQuery, useRefreshSiteContent, type PageBackground, type SiteContent } from "@/lib/site-content";

export const Route = createFileRoute("/admin/studio")({
  head: () => ({ meta: [
    { title: "Theme Studio — Comfort Hub" },
    { name: "description", content: "Design the Comfort Hub store live: colours, fonts, layout, text and images." },
    { property: "og:title", content: "Theme Studio — Comfort Hub" },
    { property: "og:description", content: "Design the Comfort Hub store live: colours, fonts, layout, text and images." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Studio,
});

const pages = [
  ["/", "Home"], ["/shop", "Shop"], ["/about", "Studio"], ["/custom", "Custom"], ["/contact", "Contact"], ["/track", "Track"], ["/cart", "Cart"],
] as const;
const devices = { desktop: { w: "100%", icon: Monitor }, tablet: { w: "820px", icon: Tablet }, mobile: { w: "390px", icon: Smartphone } } as const;

const colorFields: [keyof ThemePalette, string][] = [
  ["background", "Page background"], ["foreground", "Main text"], ["surface", "Cards"], ["muted", "Muted surface"],
  ["mutedForeground", "Muted text"], ["border", "Borders"], ["primary", "Buttons"], ["primaryForeground", "Button text"],
  ["accent", "Accent"], ["destructive", "Error"], ["selection", "Selection"], ["ring", "Focus ring"],
];
const selects: [keyof StoreTheme, string, string[]][] = [
  ["headingFont", "Heading font", ["Archivo", "JetBrains Mono"]], ["bodyFont", "Body font", ["Archivo", "JetBrains Mono"]],
  ["headingWeight", "Heading weight", ["medium", "semibold", "bold"]], ["headingStyle", "Heading style", ["tight", "editorial", "mono"]],
  ["bodyScale", "Text size", ["compact", "standard", "large"]], ["labelSpacing", "Label spacing", ["tight", "standard", "wide"]],
  ["containerWidth", "Store width", ["compact", "standard", "wide"]], ["density", "Density", ["compact", "comfortable", "airy"]],
  ["sectionSpacing", "Section spacing", ["compact", "standard", "large"]], ["headerStyle", "Header", ["solid", "glass", "borderless"]],
  ["navigationSize", "Menu size", ["compact", "standard", "large"]], ["logoSize", "Logo size", ["compact", "standard", "large"]],
  ["productRatio", "Product photo shape", ["portrait", "square", "landscape"]], ["imageFit", "Photo fit", ["cover", "contain"]],
  ["buttonStyle", "Buttons", ["solid", "outline", "soft"]], ["borderStrength", "Borders", ["subtle", "standard", "bold"]],
  ["shadow", "Shadows", ["none", "soft", "strong"]], ["radius", "Corners", ["square", "soft", "rounded"]],
  ["motion", "Motion", ["full", "subtle", "off"]], ["defaultMode", "Default mode", ["light", "dark", "system"]],
];
const presets: [string, StoreTheme][] = [
  ["Editorial Mono", DEFAULT_THEME],
  ["Gallery Light", { ...DEFAULT_THEME, defaultMode: "light", radius: "soft", motion: "subtle", grain: false, density: "airy", shadow: "soft", light: { ...DEFAULT_THEME.light, background: "#FAFAF8", surface: "#FFFFFF", accent: "#ECECE7" } }],
  ["Signal Red", { ...DEFAULT_THEME, dark: { ...DEFAULT_THEME.dark, primary: "#FF4B3E", primaryForeground: "#141414", accent: "#3D2422", ring: "#FF7167" }, headingWeight: "bold", shadow: "strong" }],
  ["Soft Sand", { ...DEFAULT_THEME, defaultMode: "light", radius: "rounded", buttonStyle: "soft", light: { ...DEFAULT_THEME.light, background: "#F4EFE6", surface: "#FBF8F2", muted: "#E8E0D2", border: "#D9CDB9", primary: "#3B3226", accent: "#E8DCC6" } }],
];

type Selected = { key: string; kind: "text" | "background" } | null;

function Studio() {
  const { data: savedTheme } = useQuery(themeQuery);
  const { data: savedContent } = useQuery(siteContentQuery);
  const refreshTheme = useRefreshTheme();
  const refreshContent = useRefreshSiteContent();
  const [theme, setTheme] = useState<StoreTheme | null>(null);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [tab, setTab] = useState<"style" | "content">("style");
  const [page, setPage] = useState<string>("/");
  const [device, setDevice] = useState<keyof typeof devices>("desktop");
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const [selected, setSelected] = useState<Selected>(null);
  const [saving, setSaving] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => { if (savedTheme && !theme) setTheme(savedTheme); }, [savedTheme, theme]);
  useEffect(() => { if (savedContent && !content) setContent(savedContent); }, [savedContent, content]);

  const push = () => {
    const win = frame.current?.contentWindow;
    if (!win) return;
    if (theme) win.postMessage({ type: "theme-studio:draft", theme, mode }, window.location.origin);
    if (content) win.postMessage({ type: "site-editor:draft", content }, window.location.origin);
  };
  useEffect(push, [theme, content, mode]);
  useEffect(() => {
    const receive = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "theme-studio:ready" || e.data?.type === "site-editor:ready") push();
      if (e.data?.type === "site-editor:select") { setSelected({ key: e.data.key, kind: e.data.kind === "background" ? "background" : "text" }); setTab("content"); }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  });

  if (!theme || !content) return <p className="label-xs text-muted-foreground">Loading studio…</p>;
  const themeChanged = JSON.stringify(theme) !== JSON.stringify(savedTheme);
  const contentChanged = JSON.stringify(content) !== JSON.stringify(savedContent);
  const changed = themeChanged || contentChanged;
  const colors = theme[mode];
  const bg = selected?.kind === "background" ? content.backgrounds[selected.key] ?? emptyBg() : null;
  const setBg = (patch: Partial<PageBackground>) => selected && setContent({ ...content, backgrounds: { ...content.backgrounds, [selected.key]: { ...emptyBg(), ...bg, ...patch } } });

  async function publish() {
    setSaving(true);
    const { data: latest } = await supabase.from("custom_settings").select("site_content").eq("id", 1).maybeSingle();
    const merged = normalizeSiteContent({ ...normalizeSiteContent(latest?.site_content), text: content!.text, backgrounds: content!.backgrounds });
    const { error } = await supabase.from("custom_settings").update({ theme: theme, site_content: merged, updated_at: new Date().toISOString() }).eq("id", 1);
    setSaving(false);
    if (error) return void toast.error(error.message);
    void supabase.from("activity_logs").insert({ area: "theme", action: "publish", summary: "Published changes from Theme Studio", details: { theme: themeChanged, content: contentChanged } });
    setContent(merged);
    await Promise.all([refreshTheme(), refreshContent()]);
    toast.success("Store design published");
  }
  async function chooseImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return void toast.error("Use a JPG, PNG or WEBP image");
    if (file.size > 8 * 1024 * 1024) return void toast.error("Image must be under 8 MB");
    try { setBg({ image: await compress(file) }); } catch { toast.error("Could not prepare that image"); }
  }

  return <div className="-m-6 min-h-screen md:-m-10">
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-5 py-3">
      <div><p className="label-xs text-muted-foreground">Theme editor v2</p><h1 className="text-xl font-semibold">Theme Studio</h1></div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Page" value={page} onChange={(e) => { setPage(e.target.value); setSelected(null); }} className="border border-border bg-surface px-3 py-2 text-sm">{pages.map(([p, l]) => <option key={p} value={p}>{l}</option>)}</select>
        <div className="inline-flex border border-border p-0.5">{(Object.keys(devices) as (keyof typeof devices)[]).map((d) => { const Icon = devices[d].icon; return <Button key={d} size="icon" variant={device === d ? "default" : "ghost"} aria-label={d} onClick={() => setDevice(d)}><Icon /></Button>; })}</div>
        <Button size="icon" variant="outline" aria-label="Preview mode" onClick={() => setMode(mode === "dark" ? "light" : "dark")}>{mode === "dark" ? <Moon /> : <Sun />}</Button>
        <Button variant="outline" asChild><a href={page} target="_blank" rel="noreferrer"><ExternalLink />Open</a></Button>
        <Button variant="ghost" disabled={!changed} onClick={() => { setTheme(savedTheme!); setContent(savedContent!); }}><RotateCcw />Discard</Button>
        <Button onClick={publish} disabled={!changed || saving}><Save />{saving ? "Publishing…" : "Publish"}</Button>
      </div>
    </header>
    <div className="grid min-h-[calc(100vh-65px)] lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="max-h-[calc(100vh-65px)] overflow-y-auto border-r border-border bg-surface p-4">
        <div className="mb-5 grid grid-cols-2 border border-border p-0.5">
          <Button variant={tab === "style" ? "default" : "ghost"} onClick={() => setTab("style")}><Paintbrush />Style</Button>
          <Button variant={tab === "content" ? "default" : "ghost"} onClick={() => setTab("content")}><Type />Text & images</Button>
        </div>
        {tab === "style" ? <div className="space-y-7">
          <section><p className="label-xs mb-2 text-muted-foreground">Presets</p><div className="grid grid-cols-2 gap-2">{presets.map(([name, t]) => <button key={name} type="button" onClick={() => setTheme(structuredClone(t))} className="border border-border bg-background p-2 text-left text-xs hover:bg-accent"><span className="mb-2 flex gap-1">{[t[mode].background, t[mode].primary, t[mode].accent].map((c, i) => <span key={i} className="size-4 border border-border" style={{ background: c }} />)}</span>{name}</button>)}</div></section>
          <section><p className="label-xs mb-2 text-muted-foreground">Colours · {mode} mode</p><div className="grid grid-cols-2 gap-2">{colorFields.map(([k, l]) => <label key={k} className="flex items-center gap-2 border border-border bg-background p-2 text-xs"><input type="color" value={colors[k]} onChange={(e) => setTheme({ ...theme, [mode]: { ...colors, [k]: e.target.value.toUpperCase() } })} className="h-7 w-8 cursor-pointer border-0 bg-transparent p-0" /><span className="truncate">{l}</span></label>)}</div></section>
          <section className="grid gap-3"><p className="label-xs text-muted-foreground">Fonts, layout & feel</p>{selects.map(([k, l, vals]) => <label key={k} className="flex items-center justify-between gap-3 text-sm"><span>{l}</span><select value={String(theme[k])} onChange={(e) => setTheme({ ...theme, [k]: e.target.value } as StoreTheme)} className="w-36 border border-border bg-background px-2 py-1.5 text-sm capitalize">{vals.map((v) => <option key={v}>{v}</option>)}</select></label>)}
            <label className="flex items-center justify-between text-sm"><span>Film grain</span><input type="checkbox" checked={theme.grain} onChange={(e) => setTheme({ ...theme, grain: e.target.checked })} className="size-4" /></label>
          </section>
        </div> : !selected ? <p className="pt-8 text-center text-sm text-muted-foreground">Click any outlined text or picture in the preview to edit it here.</p> : <div className="space-y-4">
          <p className="label-xs text-muted-foreground">Editing · {selected.key}</p>
          {selected.kind === "text" ? <textarea autoFocus rows={8} maxLength={4000} value={content.text[selected.key] ?? ""} placeholder="Type new text (leave empty to keep the original)" onChange={(e) => setContent({ ...content, text: { ...content.text, [selected.key]: e.target.value } })} className="w-full border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" /> : <>
            <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-border bg-background px-4 py-6 text-sm"><ImagePlus className="size-5" />Upload picture<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => void chooseImage(e.target.files?.[0])} /></label>
            {bg?.image && <div className="relative aspect-video overflow-hidden border border-border"><img src={bg.image} alt="" className="size-full object-cover" /><Button variant="destructive" size="icon" className="absolute top-2 right-2" aria-label="Remove picture" onClick={() => setBg({ image: "" })}><Trash2 /></Button></div>}
            <label className="block text-sm">Position<select value={bg?.position ?? "center"} onChange={(e) => setBg({ position: e.target.value as PageBackground["position"] })} className="mt-1 w-full border border-border bg-background px-2 py-1.5"><option>top</option><option>center</option><option>bottom</option></select></label>
            <label className="block text-sm">Fit<select value={bg?.fit ?? "cover"} onChange={(e) => setBg({ fit: e.target.value as PageBackground["fit"] })} className="mt-1 w-full border border-border bg-background px-2 py-1.5"><option>cover</option><option>contain</option></select></label>
            <label className="block text-sm">Darken · {bg?.overlay ?? 0}%<input type="range" min="0" max="90" value={bg?.overlay ?? 0} onChange={(e) => setBg({ overlay: Number(e.target.value) })} className="mt-1 w-full" /></label>
          </>}
        </div>}
      </aside>
      <main className="flex justify-center overflow-auto bg-muted p-4">
        <iframe ref={frame} key={page} title="Live store preview" src={`${page}?site-editor-preview=1`} onLoad={push} style={{ width: devices[device].w }} className="h-[calc(100vh-100px)] max-w-full border border-border bg-background shadow-lg transition-[width] duration-300" />
      </main>
    </div>
  </div>;
}

function emptyBg(): PageBackground { return { image: "", alt: "", position: "center", fit: "cover", overlay: 0 }; }
async function compress(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/webp", 0.78);
}
