import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = {
  productId: string;
  name: string;
  slug: string;
  size: string;
  price: number;
  image: string;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  add: (line: CartLine) => void;
  remove: (productId: string, size: string) => void;
  setQuantity: (productId: string, size: string, quantity: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "concrete-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines]);

  const value = useMemo<CartContextValue>(() => {
    const key = (l: CartLine) => `${l.productId}:${l.size}`;
    return {
      lines,
      add: (line) =>
        setLines((prev) => {
          const existing = prev.find((l) => key(l) === key(line));
          if (existing) {
            return prev.map((l) =>
              key(l) === key(line) ? { ...l, quantity: l.quantity + line.quantity } : l,
            );
          }
          return [...prev, line];
        }),
      remove: (productId, size) =>
        setLines((prev) => prev.filter((l) => !(l.productId === productId && l.size === size))),
      setQuantity: (productId, size, quantity) =>
        setLines((prev) =>
          prev
            .map((l) =>
              l.productId === productId && l.size === size
                ? { ...l, quantity: Math.max(0, quantity) }
                : l,
            )
            .filter((l) => l.quantity > 0),
        ),
      clear: () => setLines([]),
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((n, l) => n + l.quantity * l.price, 0),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
