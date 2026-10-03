import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { customSettingsQuery, estimate, inr, swatch } from "@/lib/custom";

export const Route = createFileRoute("/custom")({
  head: () => ({
    meta: [
      { title: "Custom Design — unlabelled" },
      {
        name: "description",
        content: "Upload your own artwork and get it printed on a 240 GSM heavyweight unlabelled tee.",
      },
      { property: "og:title", content: "Custom Design — unlabelled" },
      {
        property: "og:description",
        content: "Design your own heavyweight tee: upload artwork, pick colour, size and placement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomPage,
});

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

function TeeMock({
  color,
  image,
  text,
  scale,
  offset,
  side,
}: {
  color: string;
  image: string | null;
  text: string;
  scale: number;
  offset: number;
  side: "front" | "back";
}) {
  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-md">
      <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full drop-shadow-2xl">
        <path
          d="M130 40 L80 60 L20 130 L70 175 L100 150 L100 470 L300 470 L300 150 L330 175 L380 130 L320 60 L270 40 C255 75 230 90 200 90 C170 90 145 75 130 40 Z"
          fill={swatch(color)}
          stroke="currentColor"
          strokeOpacity="0.15"
        />
        {side === "front" && (
          <path d="M130 40 C145 75 170 90 200 90 C230 90 255 75 270 40" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
        )}
      </svg>
      <div
        className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center"
        style={{ top: `${28 + offset}%`, width: `${36 * scale}%` }}
      >
        {image && <img src={image} alt="Your design" className="w-full object-contain" />}
        {text && (
          <p
            className="mt-2 text-center font-display font-semibold break-words"
            style={{ color: ["white", "cream", "beige"].includes(color.toLowerCase()) ? "#111" : "#f5f5f5", fontSize: `${14 * scale}px` }}
          >
            {text}
          </p>
        )}
      </div>
      <span className="label-xs absolute right-2 bottom-2 text-muted-foreground">{side}</span>
    </div>
  );
}

function CustomPage() {
  const { data: settings, isLoading } = useQuery(customSettingsQuery);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [placement, setPlacement] = useState<"front" | "back" | "both">("front");
  const [qty, setQty] = useState(1);
  const [text, setText] = useState("");
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (settings && !color) setColor(settings.colors[0] ?? "Black");
    if (settings && !size) setSize(settings.sizes[2] ?? settings.sizes[0] ?? "M");
  }, [settings, color, size]);

  useEffect(() => {
    if (!file) return void setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const total = useMemo(() => (settings ? estimate(settings, placement, qty) : 0), [settings, placement, qty]);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!ALLOWED.includes(f.type)) return void toast.error("Use a PNG, JPG, WEBP or SVG file");
    if (f.size > 10 * 1024 * 1024) return void toast.error("File must be under 10 MB");
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    if (!file && !text.trim()) return void toast.error("Upload a design or add text");
    if (form.name.trim().length < 2) return void toast.error("Enter your name");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return void toast.error("Enter a valid email");
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, "").slice(-10))) return void toast.error("Enter a 10-digit phone number");
    setSending(true);
    try {
      let design_path = "";
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
        design_path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("custom-designs").upload(design_path, file, { contentType: file.type });
        if (error) throw error;
      }
      const { error } = await supabase.from("custom_orders").insert({
        customer_name: form.name.trim().slice(0, 100),
        customer_email: form.email.trim().slice(0, 255),
        customer_phone: form.phone.trim().slice(0, 20),
        address: form.address.trim().slice(0, 500),
        notes: `${form.notes.trim().slice(0, 1000)}${form.notes.trim() ? "\n" : ""}[preview scale ${scale.toFixed(2)}, offset ${offset}]`,
        color,
        size,
        quantity: qty,
        placement,
        design_path,
        design_text: text.trim().slice(0, 120),
        estimated_total: total,
      });
      if (error) throw error;
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error((err as { message?: string }).message ?? "Could not send your design");
    } finally {
      setSending(false);
    }
  }

  if (isLoading) return <p className="label-xs px-6 py-24 text-muted-foreground">Loading…</p>;

  if (!settings?.enabled) {
    return (
      <div className="mx-auto max-w-xl px-6 py-32 text-center">
        <h1 className="font-display text-4xl font-semibold tracking-[-0.04em]">Custom orders are paused</h1>
        <p className="mt-4 text-muted-foreground">We're not taking new custom designs right now. Check back soon.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-6 py-32 text-center">
        <p className="label-xs text-muted-foreground">Request received</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em]">Your design is with the studio.</h1>
        <p className="mt-4 text-muted-foreground">
          We'll review the artwork and contact you at {form.email} with a final quote and UPI payment details,
          usually within 24 hours.
        </p>
        <button type="button" onClick={() => location.reload()} className="label-xs mt-10 border border-border px-5 py-3">
          Design another
        </button>
      </div>
    );
  }

  const input = "w-full border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground";
  const chip = (active: boolean) =>
    `label-xs border px-3 py-2 transition-colors ${active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-10 md:py-24">
      <p className="label-xs text-muted-foreground">Custom studio</p>
      <h1 className="mt-3 max-w-3xl font-display text-5xl font-semibold tracking-[-0.05em] md:text-7xl">
        Your artwork. Our heavyweight tee.
      </h1>
      <p className="mt-5 max-w-xl text-muted-foreground">{settings.notes}</p>

      <form onSubmit={submit} className="mt-14 grid gap-12 lg:grid-cols-2">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-border bg-surface p-6 text-foreground">
            <div className={placement === "both" ? "grid grid-cols-2 gap-4" : ""}>
              {(placement === "both" ? (["front", "back"] as const) : [placement]).map((s) => (
                <TeeMock key={s} side={s} color={color} image={preview} text={text} scale={scale} offset={offset} />
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="label-xs text-muted-foreground">
              Size on shirt
              <input type="range" min={0.5} max={1.6} step={0.05} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="mt-2 w-full" />
            </label>
            <label className="label-xs text-muted-foreground">
              Position
              <input type="range" min={-8} max={30} step={1} value={offset} onChange={(e) => setOffset(Number(e.target.value))} className="mt-2 w-full" />
            </label>
          </div>
        </div>

        <div className="space-y-10">
          <section>
            <h2 className="label-xs mb-3">01 — Upload design</h2>
            <label
              className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-border px-6 py-10 text-center hover:border-foreground"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pick(e.dataTransfer.files[0]);
              }}
            >
              <input type="file" accept={ALLOWED.join(",")} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
              <span className="text-sm">{file ? file.name : "Drop your file here or click to browse"}</span>
              <span className="label-xs mt-2 text-muted-foreground">PNG, JPG, WEBP, SVG · max 10 MB</span>
            </label>
            {file && (
              <button type="button" onClick={() => setFile(null)} className="label-xs mt-2 text-muted-foreground hover:text-foreground">
                Remove file
              </button>
            )}
            <input className={`${input} mt-4`} placeholder="Optional text to print (max 120 characters)" maxLength={120} value={text} onChange={(e) => setText(e.target.value)} />
          </section>

          <section>
            <h2 className="label-xs mb-3">02 — Colour</h2>
            <div className="flex flex-wrap gap-2">
              {settings.colors.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} className={chip(color === c)}>
                  <span className="mr-2 inline-block size-3 rounded-full border border-border align-middle" style={{ background: swatch(c) }} />
                  {c}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="label-xs mb-3">03 — Size, placement & quantity</h2>
            <div className="flex flex-wrap gap-2">
              {settings.sizes.map((s) => (
                <button key={s} type="button" onClick={() => setSize(s)} className={chip(size === s)}>
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["front", "back", "both"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPlacement(p)} className={chip(placement === p)}>
                  {p === "both" ? "Front + back" : p}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="label-xs text-muted-foreground">Qty</span>
              <input type="number" min={1} max={500} value={qty} onChange={(e) => setQty(Math.min(500, Math.max(1, Number(e.target.value) || 1)))} className={`${input} w-24`} />
            </div>
          </section>

          <section>
            <h2 className="label-xs mb-3">04 — Your details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className={input} placeholder="Full name" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className={input} placeholder="Phone" maxLength={20} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className={`${input} sm:col-span-2`} type="email" placeholder="Email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <textarea className={`${input} sm:col-span-2`} rows={2} placeholder="Delivery address" maxLength={500} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <textarea className={`${input} sm:col-span-2`} rows={3} placeholder="Notes for the studio (print size, deadline…)" maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </section>

          <div className="border-t border-border pt-6">
            <div className="flex items-baseline justify-between">
              <span className="label-xs text-muted-foreground">Estimated total</span>
              <span className="font-display text-3xl font-semibold">{inr(total)}</span>
            </div>
            <p className="label-xs mt-2 text-muted-foreground">
              Final price confirmed by the studio after reviewing your artwork. No payment now.
            </p>
            <button type="submit" disabled={sending} className="label-xs mt-6 w-full bg-foreground py-4 text-background disabled:opacity-50">
              {sending ? "Sending…" : "Send design for review"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
