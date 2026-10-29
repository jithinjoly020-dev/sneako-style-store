// Pulls product details out of a supplier/brand product page.
// Works on plain HTML (JSON-LD, Open Graph, meta tags) and Shopify stores (.js endpoint).
export type ScrapedProduct = {
  name: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  sizes: string[];
  colors: string[];
  source: string;
};

const SIZE_RE = /^(xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|5xl|free ?size|\d{2})$/i;

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
}
function stripTags(s: string) {
  return decode(s.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, ""))
    .replace(/\n{3,}/g, "\n\n").trim();
}
function meta(html: string, key: string) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  return tag ? decode(tag.match(/content=["']([^"']*)["']/i)?.[1] ?? "") : "";
}
function abs(u: string, base: string) {
  try { const x = new URL(u.startsWith("//") ? "https:" + u : u, base); return x.protocol === "https:" || x.protocol === "http:" ? x.href : ""; } catch { return ""; }
}
function uniq(a: string[]) { return [...new Set(a.filter(Boolean))]; }

function findProduct(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) { for (const n of node) { const f = findProduct(n); if (f) return f; } return null; }
  const o = node as Record<string, unknown>;
  const t = o["@type"];
  if (t === "Product" || (Array.isArray(t) && t.includes("Product"))) return o;
  if (o["@graph"]) return findProduct(o["@graph"]);
  return null;
}

export function parseProductHtml(html: string, url: string): ScrapedProduct {
  const out: ScrapedProduct = { name: "", description: "", price: 0, currency: "INR", images: [], sizes: [], colors: [], source: url };
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const p = findProduct(JSON.parse((m[1] ?? "").trim()));
      if (!p) continue;
      out.name ||= String(p["name"] ?? "");
      out.description ||= stripTags(String(p["description"] ?? ""));
      const imgs = Array.isArray(p["image"]) ? p["image"] : [p["image"]];
      out.images.push(...imgs.map((i) => abs(typeof i === "string" ? i : String((i as { url?: string })?.url ?? ""), url)));
      const offers = Array.isArray(p["offers"]) ? p["offers"][0] : p["offers"] as Record<string, unknown> | undefined;
      const off = offers as Record<string, unknown> | undefined;
      const price = Number(off?.["price"] ?? off?.["lowPrice"] ?? 0);
      if (price && !out.price) { out.price = price; out.currency = String(off?.["priceCurrency"] ?? out.currency); }
      if (p["color"]) out.colors.push(String(p["color"]));
      if (p["size"]) out.sizes.push(String(p["size"]));
    } catch { /* ignore bad JSON-LD */ }
  }
  out.name ||= meta(html, "og:title") || stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  out.description ||= meta(html, "og:description") || meta(html, "description");
  if (!out.price) {
    out.price = Number(meta(html, "product:price:amount") || meta(html, "og:price:amount")) || 0;
    out.currency = meta(html, "product:price:currency") || out.currency;
  }
  out.images.push(abs(meta(html, "og:image"), url));
  out.images = uniq(out.images).slice(0, 12);
  return out;
}

type ShopifyJs = {
  title?: string; description?: string; price?: number; images?: string[];
  options?: { name: string; values: string[] }[];
};
export function mergeShopify(p: ScrapedProduct, j: ShopifyJs, url: string): ScrapedProduct {
  const next = { ...p };
  if (j.title) next.name = j.title;
  if (j.description) next.description = stripTags(j.description);
  if (j.price) next.price = j.price / 100;
  if (j.images?.length) next.images = uniq(j.images.map((i) => abs(i, url))).slice(0, 12);
  for (const o of j.options ?? []) {
    if (/size/i.test(o.name)) next.sizes = o.values;
    else if (/colou?r/i.test(o.name)) next.colors = o.values;
    else if (o.values.every((v) => SIZE_RE.test(v.trim()))) next.sizes = o.values;
  }
  return next;
}

// Supplier price → selling price: markup %, then round up to the nearest ₹..99 ending.
export function sellingPrice(cost: number, markupPct: number, roundTo99: boolean) {
  const raw = cost * (1 + markupPct / 100);
  if (!roundTo99) return Math.round(raw);
  return Math.max(99, Math.ceil((raw + 1) / 100) * 100 - 1);
}

export function isSafeUrl(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h.includes(":") || h.startsWith("[")) return false;
    return true;
  } catch { return false; }
}
