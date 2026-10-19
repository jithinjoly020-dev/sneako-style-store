import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ImagePlus, Monitor, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { normalizeSiteContent, siteContentQuery, useRefreshSiteContent, type PageBackground, type SiteContent } from "@/lib/site-content";

export const Route = createFileRoute("/admin/site-editor")({
  head: () => ({ meta: [
    { title: "Site Editor — Comfort Hub" },
    { name: "description", content: "Edit storefront copy and page images." },
    { property: "og:title", content: "Site Editor — Comfort Hub" },
    { property: "og:description", content: "Edit storefront copy and page images." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: SiteEditor,
});

const pages = [
  { path: "/", label: "Home", texts: [
    ["home.eyebrow", "Collection 01 — Comfort Hub"], ["home.title", "WEIGHT OVER NOISE"],
    ["home.intro", "Heavyweight cotton basics built in a grey-only palette. Made to be worn every day, washed hard, and to still look like itself two years from now."],
    ["home.primaryCta", "Shop the collection"], ["home.secondaryCta", "The studio"],
    ["home.manifestoLabel", "Manifesto"], ["home.manifesto", "Most t-shirts are a billboard with sleeves. We took the graphics off, doubled the fabric weight, and spent the difference on cotton. What's left is a shirt that does one job properly — and gets out of the way."],
    ["home.featured", "Featured"], ["home.collectibles", "Every drop ships with a digital card"],
    ["home.process", "Four steps, no shortcuts"], ["home.questions", "Questions, answered plainly"], ["home.finalCta", "BUY ONE. WEAR IT OUT."],
  ], backgrounds: [["home.hero", "Top banner"], ["home.collectiblesBg", "Collectibles section"], ["global.page", "Global page background"]] },
  { path: "/shop", label: "Shop", texts: [["shop.title", "SHOP"], ["shop.empty", "No products in this collection yet."]], backgrounds: [["shop.hero", "Shop top area"]] },
  { path: "/about", label: "Studio", texts: [["about.eyebrow", "The studio"], ["about.title", "MADE PLAINLY"], ["about.intro", "Comfort Hub makes one thing properly: heavy cotton bodies that keep their shape after fifty washes. No seasonal churn, no logos, no story we can't back up on the label."], ["about.process", "HOW A RUN IS MADE"], ["about.values", "WHAT WE HOLD TO"], ["about.sizing", "SIZING, PLAINLY"]], backgrounds: [["about.hero", "Studio top area"]] },
  { path: "/custom", label: "Custom", texts: [["custom.eyebrow", "Custom studio"], ["custom.title", "Your artwork. Our heavyweight tee."], ["custom.upload", "01 — Upload design"], ["custom.color", "02 — Colour"], ["custom.options", "03 — Size, placement & quantity"], ["custom.details", "04 — Your details"], ["custom.submit", "Send design for review"]], backgrounds: [["custom.hero", "Custom top area"]] },
  { path: "/contact", label: "Contact", texts: [["contact.eyebrow", "Talk to us"], ["contact.title", "CONTACT"], ["contact.intro", "A real person reads every message. We answer within one working day, usually much sooner."], ["contact.questions", "COMMON QUESTIONS"], ["contact.footer", "Heavyweight basics. Nothing extra."]], backgrounds: [["contact.hero", "Contact top area"]] },
] as const;

type Field = { key: string; label: string; kind: "text" | "background"; fallback?: string };

function SiteEditor() {
  const { data } = useQuery(siteContentQuery);
  const refresh = useRefreshSiteContent();
  const [pageIndex, setPageIndex] = useState(0);
  const [form, setForm] = useState<SiteContent | null>(null);
  const [selected, setSelected] = useState<Field | null>(null);
  const [saving, setSaving] = useState(false);
  const iframe = useRef<HTMLIFrameElement>(null);
  useEffect(() => { if (data && !form) setForm(data); }, [data, form]);
  const page = pages[pageIndex] ?? pages[0];
  const fields: Field[] = [
    ...page.texts.map(([key, fallback]) => ({ key, fallback, label: key.split(".").at(-1) ?? key, kind: "text" as const })),
    ...page.backgrounds.map(([key, label]) => ({ key, label, kind: "background" as const })),
  ];
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "site-editor:select") setSelected(fields.find((field) => field.key === event.data.key) ?? null);
      if (event.data?.type === "site-editor:ready" && form) iframe.current?.contentWindow?.postMessage({ type: "site-editor:draft", content: form }, window.location.origin);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [fields, form]);
  useEffect(() => { if (form) iframe.current?.contentWindow?.postMessage({ type: "site-editor:draft", content: form }, window.location.origin); }, [form]);
  if (!form) return <p className="label-xs text-muted-foreground">Loading site editor…</p>;
  const changed = Boolean(data) && JSON.stringify(form) !== JSON.stringify(data);
  const background = selected?.kind === "background" ? form.backgrounds[selected.key] ?? emptyBackground() : null;
  async function save() {
    const clean = normalizeSiteContent(form);
    setSaving(true);
    const { error } = await supabase.from("custom_settings").update({ site_content: clean, updated_at: new Date().toISOString() }).eq("id", 1);
    setSaving(false);
    if (error) return void toast.error(error.message);
    setForm(clean);
    await refresh();
    toast.success("Site changes published");
  }
  const updateBackground = (patch: Partial<PageBackground>) => selected && setForm({ ...form, backgrounds: { ...form.backgrounds, [selected.key]: { ...emptyBackground(), ...background, ...patch } } });
  async function chooseImage(file?: File) {
    if (!file || !selected) return;
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return void toast.error("Use a JPG, PNG, WEBP or AVIF image");
    if (file.size > 8 * 1024 * 1024) return void toast.error("Image must be under 8 MB");
    try { updateBackground({ image: await compressImage(file) }); } catch { toast.error("Could not prepare that image"); }
  }
  return <div className="-m-6 min-h-screen md:-m-10">
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-5 py-4">
      <div><p className="label-xs text-muted-foreground">Visual storefront</p><h1 className="text-2xl font-semibold">Site editor</h1></div>
      <div className="flex items-center gap-2"><span className="hidden text-xs text-muted-foreground sm:inline">{changed ? "Unpublished changes" : "Published"}</span><Button onClick={save} disabled={!changed || saving}><Save />{saving ? "Publishing…" : "Publish"}</Button></div>
    </header>
    <div className="grid min-h-[calc(100vh-73px)] xl:grid-cols-[280px_minmax(480px,1fr)_320px]">
      <aside className="border-r border-border bg-surface p-4">
        <p className="label-xs mb-3 text-muted-foreground">Pages</p>
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">{pages.map((item, index) => <Button key={item.path} variant={index === pageIndex ? "default" : "ghost"} className="justify-start" onClick={() => { setPageIndex(index); setSelected(null); }}>{item.label}</Button>)}</div>
        <p className="label-xs mt-8 mb-3 text-muted-foreground">Editable areas</p>
        <div className="space-y-1">{fields.map((field) => <Button key={field.key} variant={selected?.key === field.key ? "secondary" : "ghost"} className="w-full justify-start capitalize" onClick={() => setSelected(field)}>{field.kind === "background" && <ImagePlus />}{field.label.replace(/([A-Z])/g, " $1")}</Button>)}</div>
      </aside>
      <main className="min-h-[680px] bg-muted p-3 md:p-6"><div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"><Monitor className="size-4" />Click highlighted text or backgrounds in the live page.</div><iframe ref={iframe} title={`${page.label} live preview`} key={page.path} src={`${page.path}?site-editor-preview=1`} className="h-[calc(100vh-145px)] min-h-[650px] w-full border border-border bg-background shadow-lg" /></main>
      <aside className="border-l border-border bg-background p-5">
        {!selected ? <div className="pt-10 text-center text-sm text-muted-foreground"><Monitor className="mx-auto mb-3 size-6" />Choose an area from the list or click it in the preview.</div> : <>
          <p className="label-xs text-muted-foreground">Editing</p><h2 className="mt-2 text-xl font-semibold capitalize">{selected.label.replace(/([A-Z])/g, " $1")}</h2>
          {selected.kind === "text" ? <textarea autoFocus rows={selected.key.includes("title") ? 3 : 8} maxLength={4000} value={form.text[selected.key] ?? selected.fallback ?? ""} onChange={(e) => setForm({ ...form, text: { ...form.text, [selected.key]: e.target.value } })} className="mt-5 w-full resize-y border border-border bg-surface p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring" /> : <div className="mt-5 space-y-5">
            <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-border bg-surface px-4 py-8 text-sm hover:border-foreground"><ImagePlus className="size-5" />Upload background<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => void chooseImage(e.target.files?.[0])} /></label>
            {background?.image && <div className="relative aspect-video overflow-hidden border border-border"><img src={background.image} alt="" className="size-full object-cover" /><Button variant="destructive" size="icon" className="absolute top-2 right-2" aria-label="Remove background" onClick={() => updateBackground({ image: "" })}><Trash2 /></Button></div>}
            <label className="block text-sm">Accessible description<input maxLength={240} value={background?.alt ?? ""} onChange={(e) => updateBackground({ alt: e.target.value })} className="mt-2 w-full border border-border bg-surface px-3 py-2 outline-none focus:ring-2 focus:ring-ring" /></label>
            <label className="block text-sm">Image position<select value={background?.position ?? "center"} onChange={(e) => updateBackground({ position: e.target.value as PageBackground["position"] })} className="mt-2 w-full border border-border bg-surface px-3 py-2"><option>top</option><option>center</option><option>bottom</option></select></label>
            <label className="block text-sm">Image fit<select value={background?.fit ?? "cover"} onChange={(e) => updateBackground({ fit: e.target.value as PageBackground["fit"] })} className="mt-2 w-full border border-border bg-surface px-3 py-2"><option>cover</option><option>contain</option></select></label>
            <label className="block text-sm">Overlay · {background?.overlay ?? 0}%<input type="range" min="0" max="90" value={background?.overlay ?? 0} onChange={(e) => updateBackground({ overlay: Number(e.target.value) })} className="mt-2 w-full" /></label>
          </div>}
        </>}
      </aside>
    </div>
  </div>;
}

function emptyBackground(): PageBackground { return { image: "", alt: "", position: "center", fit: "cover", overlay: 0 }; }

async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.78);
}