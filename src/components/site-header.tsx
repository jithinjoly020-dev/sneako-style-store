import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "Studio" },
  { to: "/custom", label: "Custom" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="site-container mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 md:px-10">
        <Link to="/" aria-label="Comfort Hub home" className="block">
          <img src="/images/comforthub-logo.png" alt="Comfort Hub" className="brand-logo h-auto w-[150px] sm:w-[200px]" />
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="label-xs text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "label-xs text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <ThemeToggle />
          <Link to="/cart" className="label-xs text-foreground">
            Cart ({count})
          </Link>
          <Button
            type="button"
            aria-label="Menu"
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-4 border-t border-border px-5 py-5 md:hidden">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="label-xs" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
