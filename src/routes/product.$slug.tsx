import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { productBySlugQuery } from "@/lib/products";
import { money, useCart } from "@/lib/cart";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Comfort Hub` },
      { name: "description", content: "Heavyweight cotton, minimal cut, built to last." },
      { property: "og:title", content: `${params.slug.replace(/-/g, " ")} — Comfort Hub` },
      { property: "og:description", content: "Heavyweight cotton, minimal cut, built to last." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: product, isLoading } = useQuery(productBySlugQuery(slug));
  const [size, setSize] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const { add } = useCart();
  const navigate = useNavigate();

  if (isLoading) {
    return <p className="label-xs px-5 py-20 text-muted-foreground md:px-10">Loading…</p>;
  }

  if (!product) {
    return (
      <div className="px-5 py-24 md:px-10">
        <h1 className="text-3xl font-semibold">Product not found</h1>
        <Link to="/shop" className="label-xs mt-4 inline-block text-muted-foreground">
          Back to shop
        </Link>
      </div>
    );
  }

  const soldOut = product.stock <= 0;
  const noSizes = product.sizes.length === 0;
  const images = [product.image_url, ...(product.gallery ?? [])].filter(Boolean);
  const shown = images[Math.min(active, images.length - 1)] ?? product.image_url;

  const addToCart = () => {

    if (!noSizes && !size) { toast.error("Pick a size first"); return false; }

    add({ productId: product.id, name: product.name, slug: product.slug, size: noSizes ? "" : size!, price: Number(product.price), image: product.image_url, quantity: 1 });

    return true;

  };

  return (
    <div className="mx-auto grid max-w-[1400px] gap-px bg-border md:grid-cols-2">
      <div className="bg-muted">
        <img
          src={shown}
          alt={product.name}
          width={1024}
          height={1280}
          className="aspect-[4/5] w-full object-cover"
        />
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto bg-background p-3">
            {images.map((src, i) => (
              <button
                key={src + i}
                type="button"
                aria-label={`Show image ${i + 1}`}
                onClick={() => setActive(i)}
                className={i === active ? "shrink-0 border border-foreground" : "shrink-0 border border-transparent opacity-70 hover:opacity-100"}
              >
                <img src={src} alt="" loading="lazy" className="size-16 object-cover md:size-20" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-background p-6 md:p-14">
        <p className="label-xs text-muted-foreground">{product.category}</p>
        <h1 className="mt-4 text-3xl font-semibold md:text-5xl">{product.name}</h1>
        <p className="mt-4 font-mono text-lg">{money(Number(product.price))}</p>
        <p className="mt-8 max-w-md leading-relaxed text-muted-foreground">
          {product.description}
        </p>

        {!noSizes && <div className="mt-10">
          <p className="label-xs text-muted-foreground">Size</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={
                  s === size
                    ? "border border-foreground bg-primary px-5 py-3 text-sm text-primary-foreground"
                    : "border border-border px-5 py-3 text-sm transition-colors hover:border-foreground"
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>}

        <div className="mt-10 flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            disabled={soldOut}
            onClick={() => addToCart() && toast.success(`${product.name}${size && !noSizes ? ` (${size})` : ""} added to cart`)}
            className="w-full border border-foreground px-8 py-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40 md:w-auto"
          >
            {soldOut ? "Sold out" : "Add to cart"}
          </button>
          {!soldOut && (
            <button
              type="button"
              onClick={() => { if (addToCart()) void navigate({ to: "/checkout" }); }}
              className="w-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-85 md:w-auto"
            >
              Buy now
            </button>
          )}
        </div>

        <div className="mt-12 space-y-2 border-t border-border pt-6">
          <p className="label-xs text-muted-foreground">
            {product.stock} in stock · Ships within 48 hours
          </p>
          <p className="label-xs text-muted-foreground">5% off prepaid · COD available</p>
        </div>
      </div>
    </div>
  );
}
