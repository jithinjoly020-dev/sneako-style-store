import { createFileRoute, Link } from "@tanstack/react-router";
import { money, useCart } from "@/lib/cart";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — Comfort Hub" },
      { name: "description", content: "Review your Comfort Hub order before checkout." },
      { property: "og:title", content: "Your Cart — Comfort Hub" },
      { property: "og:description", content: "Review your Comfort Hub order before checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, setQuantity, remove, subtotal } = useCart();

  return (
    <div className="mx-auto max-w-[1000px] px-5 py-14 md:px-10 md:py-20">
      <h1 className="text-4xl font-semibold md:text-6xl">CART</h1>

      {lines.length === 0 ? (
        <div className="mt-10">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Link
            to="/shop"
            className="mt-6 inline-flex bg-primary px-6 py-3 text-sm text-primary-foreground"
          >
            Browse the shop
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-10 border-t border-border">
            {lines.map((l) => (
              <div
                key={`${l.productId}-${l.size}`}
                className="flex gap-5 border-b border-border py-5"
              >
                <img
                  src={l.image}
                  alt={l.name}
                  loading="lazy"
                  className="size-24 shrink-0 object-cover"
                />
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-medium">{l.name}</p>
                      {l.size && <p className="label-xs mt-1 text-muted-foreground">Size {l.size}</p>}
                    </div>
                    <p className="font-mono text-sm">{money(l.price * l.quantity)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-border">
                      <button
                        type="button"
                        className="px-3 py-1"
                        onClick={() => setQuantity(l.productId, l.size, l.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-mono text-sm">{l.quantity}</span>
                      <button
                        type="button"
                        className="px-3 py-1"
                        onClick={() => setQuantity(l.productId, l.size, l.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="label-xs text-muted-foreground hover:text-foreground"
                      onClick={() => remove(l.productId, l.size)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <p className="label-xs text-muted-foreground">Subtotal</p>
            <p className="font-mono text-xl">{money(subtotal)}</p>
          </div>
          <Link
            to="/checkout"
            className="mt-8 inline-flex w-full justify-center bg-primary px-8 py-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-85 md:w-auto"
          >
            Checkout
          </Link>
        </>
      )}
    </div>
  );
}
