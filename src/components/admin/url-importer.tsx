import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sellingPrice, type ScrapedProduct } from "@/lib/product-scrape";

const STATIC_HOST = import.meta.env["VITE_STATIC_HOST"] === "1";
const ENDPOINT = STATIC_HOST ? "/api/scrape.php" : "/api/scrape-product";

export type ImportedDraft = {
  name: string; description: string; price: string; image_url: string; gallery: string[];
  sizes: string; colors: string;
};

export function UrlImporter({ onUse, onClose }: { onUse: (d: ImportedDraft) => void; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [p, setP] = useState<ScrapedProduct | null>(null);
  const [markup, setMarkup] = useState(40);
  const [round, setRound] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);

  async function fetchIt() {
    setLoading(true); setP(null);
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ url }),
      });
      const j = (await res.json().catch(() => ({}))) as { product?: ScrapedProduct; error?: string };
      if (!res.ok || !j.product) throw new Error(j.error || `Import failed (${res.status})`);
      setP(j.product); setPicked(j.product.images);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  }

  const price = p ? sellingPrice(p.price, markup, round) : 0;

  return (
    <div className="mt-8 border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <p className="label-xs text-muted-foreground">Import from supplier / brand link</p>
        <button onClick={onClose} className="text-xs text-muted-foreground underline">Close</button>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://brand.com/products/oversized-tee"
          className="flex-1 border border-border bg-background px-3 py-2 text-sm" />
        <button disabled={loading || !url.trim()} onClick={fetchIt}
          className="bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {loading ? "Reading page…" : "Fetch product"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Works best with Shopify stores and shops that show product details to Google. Only import products you have the right to sell.</p>

      {p && (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-xs text-muted-foreground">Photos — click to include or skip ({picked.length} chosen)</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {p.images.map((img) => (
                <button key={img} type="button"
                  onClick={() => setPicked((s) => s.includes(img) ? s.filter((x) => x !== img) : [...s, img])}
                  className={`aspect-square overflow-hidden border-2 ${picked.includes(img) ? "border-primary" : "border-transparent opacity-40"}`}>
                  <img src={img} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <p className="text-lg font-semibold">{p.name}</p>
            <p className="line-clamp-4 text-muted-foreground">{p.description || "No description found."}</p>
            <p>Supplier price: <b>{p.currency} {p.price || "—"}</b></p>
            <p>Sizes: {p.sizes.join(", ") || "none found"} · Colours: {p.colors.join(", ") || "none found"}</p>
            <label className="flex items-center gap-3">Markup
              <input type="number" value={markup} onChange={(e) => setMarkup(Number(e.target.value) || 0)}
                className="w-20 border border-border bg-background px-2 py-1" />%
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={round} onChange={(e) => setRound(e.target.checked)} /> Round to ₹…99
            </label>
            <p>Your selling price: <b>₹{price}</b></p>
            <button
              onClick={() => onUse({
                name: p.name, description: p.description, price: String(price),
                image_url: picked[0] ?? "", gallery: picked.slice(1),
                sizes: p.sizes.join(", "), colors: p.colors.join(", "),
              })}
              className="bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
              Use these details →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
