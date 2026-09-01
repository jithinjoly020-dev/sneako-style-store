import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { productsQuery } from "@/lib/products";
import { ProductCard } from "@/components/product-card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Concrete — Heavyweight T-Shirts, Nothing Extra" },
      {
        name: "description",
        content:
          "Concrete makes heavyweight cotton t-shirts and basics in a tight, unbranded palette. Free shipping over $100.",
      },
      { property: "og:title", content: "Concrete — Heavyweight T-Shirts" },
      {
        property: "og:description",
        content: "Heavyweight cotton tees in a tight, unbranded palette.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: products = [] } = useQuery(productsQuery);
  const featured = products.filter((p) => p.featured && p.is_active).slice(0, 4);

  return (
    <div>
      <section className="relative">
        <div className="relative h-[78vh] min-h-[520px] w-full overflow-hidden">
          <img
            src="/images/hero.jpg"
            alt="Model wearing an oversized heavyweight grey t-shirt against a concrete wall"
            width={1920}
            height={1200}
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-background/10" />

          <div className="absolute inset-0 mx-auto flex max-w-[1400px] flex-col justify-end px-5 pb-14 md:px-10 md:pb-20">
            <p className="label-xs fade-up text-muted-foreground">Collection 01 — Concrete</p>
            <h1 className="fade-up mt-4 max-w-4xl text-[13vw] leading-[0.86] font-semibold tracking-[-0.05em] md:text-[7rem]">
              WEIGHT
              <br />
              OVER NOISE
            </h1>
            <div className="fade-up mt-8">
              <Link
                to="/shop"
                className="inline-flex items-center bg-primary px-8 py-4 text-sm font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-85"
              >
                Shop the collection
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-16 md:px-10 md:py-24">
        <div className="hairline flex items-end justify-between pb-5">
          <h2 className="text-2xl font-semibold md:text-4xl">Featured</h2>
          <Link to="/shop" className="label-xs text-muted-foreground hover:text-foreground">
            All products
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-px bg-border md:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-[1400px] gap-px bg-border px-0 md:grid-cols-3">
          {[
            { k: "240 GSM", v: "Combed cotton, garment dyed, pre-shrunk." },
            { k: "No logos", v: "Blank by design. Nothing printed you didn't ask for." },
            { k: "Ships in 48h", v: "Cash on delivery available at checkout." },
          ].map((f) => (
            <div key={f.k} className="bg-background p-8 md:p-12">
              <p className="label-xs text-muted-foreground">{f.k}</p>
              <p className="mt-4 text-lg leading-snug">{f.v}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
