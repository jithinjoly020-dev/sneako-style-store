import { Link } from "@tanstack/react-router";
import { EditableText } from "@/lib/site-content";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="site-container mx-auto flex max-w-[1400px] flex-col gap-8 px-5 py-14 md:flex-row md:items-end md:justify-between md:px-10">
        <div>
          <img src="/images/unlabelled-logo.png" alt="COMFORT HUB" className="brand-logo h-auto w-[min(72vw,360px)]" />
          <EditableText as="p" contentKey="contact.footer" fallback="Your daily dose of comfort." className="label-xs mt-3 text-muted-foreground" />
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
          © {new Date().getFullYear()} Comfort Hub · UPI & cash on delivery · Free shipping over ₹2,999
        </p>
      </div>
    </footer>
  );
}
