import { Link } from "@tanstack/react-router";
import type { Product } from "@/lib/products";
import { money } from "@/lib/cart";
import { Tilt3D } from "@/components/three-d";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Tilt3D className="h-full">
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="group block h-full border border-border bg-surface"
      >
        <div className="product-media aspect-[4/5] overflow-hidden bg-muted">
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-border px-4 py-4">
          <div>
            <p className="text-sm font-medium">{product.name}</p>
            <p className="label-xs mt-1 text-muted-foreground">{product.category}</p>
          </div>
          <p className="font-mono text-sm">{money(Number(product.price))}</p>
        </div>
      </Link>
    </Tilt3D>
  );
}
