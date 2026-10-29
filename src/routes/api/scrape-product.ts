import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { isSafeUrl, mergeShopify, parseProductHtml } from "@/lib/product-scrape";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/scrape-product")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!token || !url || !key) return json(401, { error: "Sign in as admin first." });
        const sb = createClient(url, key, {
          auth: { persistSession: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: u } = await sb.auth.getUser(token);
        if (!u.user) return json(401, { error: "Sign in as admin first." });
        const { data: isAdmin } = await sb.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
        if (!isAdmin) return json(403, { error: "Admins only." });

        const body = (await request.json().catch(() => ({}))) as { url?: string };
        const target = String(body.url ?? "").trim();
        if (!isSafeUrl(target)) return json(400, { error: "Paste a full product link starting with https://" });

        const res = await fetch(target, { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow" }).catch(() => null);
        if (!res || !res.ok) return json(502, { error: `That page could not be opened (${res?.status ?? "no response"}).` });
        const html = (await res.text()).slice(0, 3_000_000);
        let product = parseProductHtml(html, res.url || target);

        const u2 = new URL(res.url || target);
        if (/\/products\/[^/]+/.test(u2.pathname)) {
          const js = await fetch(`${u2.origin}${u2.pathname.replace(/\/$/, "")}.js`, { headers: { "User-Agent": UA } }).catch(() => null);
          if (js?.ok) product = mergeShopify(product, await js.json().catch(() => ({})), u2.href);
        }
        if (!product.name) return json(422, { error: "No product details found on that page." });
        return json(200, { product });
      },
    },
  },
});
