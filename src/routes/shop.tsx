import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { productsQuery } from "@/lib/products";
import { ProductCard } from "@/components/product-card";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop All — Concrete" },
      {
        name: "description",
        content: "Browse every Concrete tee, long sleeve and basic. Heavyweight cotton only.",
      },
      { property: "og:title", content: "Shop All — Concrete" },
      { property: "og:description", content: "Every Concrete tee and basic in one place." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { data: products = [], isLoading } = useQuery(productsQuery);
  const [category, setCategory] = useState("all");

  const active = products.filter((p) => p.is_active);
  const categories = ["all", ...Array.from(new Set(active.map((p) => p.category)))];
  const visible = category === "all" ? active : active.filter((p) => p.category === category);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-10 md:py-20">
      <h1 className="text-4xl font-semibold md:text-7xl">SHOP</h1>
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
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
