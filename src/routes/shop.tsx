import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { productsQuery } from "@/lib/products";
import { useLiveProducts } from "@/lib/live";
import { ProductCard } from "@/components/product-card";
import { EditableBackground, EditableText } from "@/lib/site-content";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop All — unlabelled" },
      {
        name: "description",
        content: "Browse every unlabelled tee, long sleeve and basic. Heavyweight cotton only.",
      },
      { property: "og:title", content: "Shop All — unlabelled" },
      { property: "og:description", content: "Every unlabelled tee and basic in one place." },
    ],
  }),
  component: Shop,
});

function Shop() {
  useLiveProducts();
  const { data: products = [], isLoading } = useQuery(productsQuery);
  const [category, setCategory] = useState("all");

  const active = products.filter((p) => p.is_active);
  const categories = ["all", ...Array.from(new Set(active.map((p) => p.category)))];
  const visible = category === "all" ? active : active.filter((p) => p.category === category);

  return (
    <EditableBackground contentKey="shop.hero" className="mx-auto max-w-[1400px] px-5 py-14 md:px-10 md:py-20">
      <EditableText as="h1" contentKey="shop.title" fallback="SHOP" className="text-4xl font-semibold md:text-7xl" />
      <div className="hairline mt-8 flex flex-wrap gap-6 pb-5">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={
              c === category
                ? "label-xs text-foreground underline underline-offset-4"
                : "label-xs text-muted-foreground hover:text-foreground"
            }
          >
            {c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="label-xs mt-10 text-muted-foreground">Loading…</p>
      ) : (
          <div className="mt-8 grid grid-cols-2 gap-px bg-border md:grid-cols-3 lg:grid-cols-4">
          {visible.map((p, i) => (
            <div key={`${category}-${p.id}`} className="shop-item bg-background" style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }}>
              <ProductCard product={p} />
            </div>
          ))}
            {!visible.length && <EditableText as="p" contentKey="shop.empty" fallback="No products in this collection yet." className="col-span-full bg-background py-16 text-center text-sm text-muted-foreground" />}
          </div>
      )}
    </EditableBackground>
  );
}
