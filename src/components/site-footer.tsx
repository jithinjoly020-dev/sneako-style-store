import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-5 py-14 md:flex-row md:items-end md:justify-between md:px-10">
        <div>
          <p className="font-display text-4xl font-semibold tracking-[-0.05em] md:text-6xl">
            UNLABELLED
          </p>
          <p className="label-xs mt-3 text-muted-foreground">Heavyweight basics. Nothing extra.</p>
        </div>
        <div className="flex gap-10">
          <Link to="/shop" className="label-xs text-muted-foreground hover:text-foreground">
            Shop
          </Link>
          <Link to="/about" className="label-xs text-muted-foreground hover:text-foreground">
            Studio
          </Link>
          <Link to="/contact" className="label-xs text-muted-foreground hover:text-foreground">
            Contact
          </Link>
        </div>
      </div>
      <div className="border-t border-border px-5 py-5 md:px-10">
        <p className="label-xs text-muted-foreground">
          © {new Date().getFullYear()} unlabelled · Secure payments · Free shipping over ₹2,999
        </p>
      </div>
    </footer>
  );
}
