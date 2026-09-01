import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { productsQuery } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { Reveal3D, Parallax3D, Tilt3D } from "@/components/three-d";

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

const specs = [
  { k: "240 GSM", v: "Combed ring-spun cotton, garment dyed, pre-shrunk so it stays the size you bought." },
  { k: "No logos", v: "Blank by design. Nothing printed on you that you didn't ask for." },
  { k: "Ships in 48h", v: "Packed and dispatched within two working days. Cash on delivery available." },
];

const process = [
  {
    n: "01",
    t: "Yarn",
    d: "We start with long-staple combed cotton spun to a dense 240 GSM. Heavier yarn means less pilling, less transparency and a hem that hangs straight instead of curling after a week.",
  },
  {
    n: "02",
    t: "Cut",
    d: "One relaxed block, graded across five sizes. Dropped shoulder, wide body, high neckband ribbed at 2x1 so it holds its shape through the wash cycle.",
  },
  {
    n: "03",
    t: "Dye",
    d: "Garment dyed in small lots in a grey-only palette — ink, steel, ash and bone. Slight lot-to-lot variation is intentional, not a defect.",
  },
  {
    n: "04",
    t: "Finish",
    d: "Pre-shrunk, softened, inspected by hand, folded flat. No hang tag, no neck print, no branding you have to cut out.",
  },
];

const faqs = [
  {
    q: "How should it fit?",
    a: "Relaxed. Take your normal size for a boxy fit or size down for something closer to the body. Full measurements sit on every product page.",
  },
  {
    q: "Do you take cash on delivery?",
    a: "Yes. Choose cash on delivery at checkout and pay the courier when the box arrives. Card and UPI are also supported.",
  },
  {
    q: "What about returns?",
    a: "Fourteen days, unworn, tags intact. Message us from the contact page and we arrange the pickup.",
  },
  {
    q: "How do I wash it?",
    a: "Cold machine wash, inside out, dry flat. No bleach, no tumble dry — heavyweight cotton keeps its hand feel for years if you keep it off high heat.",
  },
];

function Index() {
  const { data: products = [] } = useQuery(productsQuery);
  const featured = products.filter((p) => p.featured && p.is_active).slice(0, 4);

  return (
    <div>
      <section className="relative">
        <div className="relative h-[78vh] min-h-[520px] w-full overflow-hidden">
          <Parallax3D speed={0.14} className="absolute inset-0">
            <img
              src="/images/hero.jpg"
              alt="Model wearing an oversized heavyweight grey t-shirt against a concrete wall"
              width={1920}
              height={1200}
              className="h-[120%] w-full object-cover"
            />
          </Parallax3D>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-background/10" />
          <div className="absolute inset-0 mx-auto flex max-w-[1400px] flex-col justify-end px-5 pb-14 md:px-10 md:pb-20">
            <p className="label-xs fade-up text-muted-foreground">Collection 01 — Concrete</p>
            <h1 className="fade-up mt-4 max-w-4xl text-[13vw] leading-[0.86] font-semibold tracking-[-0.05em] md:text-[7rem]">
              WEIGHT
              <br />
              OVER NOISE
            </h1>
            <p className="fade-up mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Heavyweight cotton basics built in a grey-only palette. Made to be worn every day,
              washed hard, and to still look like itself two years from now.
            </p>
            <div className="fade-up mt-8 flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="inline-flex items-center bg-primary px-8 py-4 text-sm font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-85"
              >
                Shop the collection
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center border border-border px-8 py-4 text-sm font-medium tracking-wide transition-colors hover:bg-accent"
              >
                The studio
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-16 md:px-10 md:py-24">
        <Reveal3D>
          <p className="label-xs text-muted-foreground">Manifesto</p>
          <p className="mt-6 max-w-4xl text-2xl leading-[1.25] font-medium tracking-[-0.02em] md:text-[2.75rem]">
            Most t-shirts are a billboard with sleeves. We took the graphics off, doubled the
            fabric weight, and spent the difference on cotton. What's left is a shirt that does one
            job properly — and gets out of the way.
          </p>
        </Reveal3D>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 pb-16 md:px-10 md:pb-24">
        <Reveal3D>
          <div className="hairline flex items-end justify-between pb-5">
            <h2 className="text-2xl font-semibold md:text-4xl">Featured</h2>
            <Link to="/shop" className="label-xs text-muted-foreground hover:text-foreground">
              All products
            </Link>
          </div>
        </Reveal3D>
        <div className="mt-8 grid grid-cols-2 gap-px bg-border md:grid-cols-4">
          {featured.map((p, i) => (
            <Reveal3D key={p.id} delay={i * 80}>
              <ProductCard product={p} />
            </Reveal3D>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-[1400px] gap-px bg-border px-0 md:grid-cols-3">
          {specs.map((f, i) => (
            <Reveal3D key={f.k} delay={i * 90}>
              <div className="h-full bg-background p-8 md:p-12">
                <p className="label-xs text-muted-foreground">{f.k}</p>
                <p className="mt-4 text-lg leading-snug">{f.v}</p>
              </div>
            </Reveal3D>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-10 md:py-24">
          <Reveal3D>
            <p className="label-xs text-muted-foreground">How it's made</p>
            <h2 className="mt-4 text-3xl font-semibold md:text-5xl">Four steps, no shortcuts</h2>
          </Reveal3D>
          <div className="mt-10 grid gap-px bg-border md:grid-cols-2">
            {process.map((s, i) => (
              <Reveal3D key={s.n} delay={i * 70}>
                <Tilt3D max={5} className="h-full">
                  <div className="h-full bg-surface p-8 md:p-10">
                    <p className="font-mono text-sm text-muted-foreground">{s.n}</p>
                    <h3 className="mt-4 text-xl font-semibold md:text-2xl">{s.t}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
                  </div>
                </Tilt3D>
              </Reveal3D>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-16 md:grid-cols-2 md:px-10 md:py-24">
          <Reveal3D>
            <h2 className="text-3xl font-semibold md:text-5xl">
              Questions,
              <br />
              answered plainly
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
              Anything not covered here, write to us from the contact page. A person reads every
              message, usually the same day.
            </p>
          </Reveal3D>
          <div>
            {faqs.map((f, i) => (
              <Reveal3D key={f.q} delay={i * 60}>
                <div className="hairline py-6">
                  <h3 className="text-base font-medium">{f.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </div>
              </Reveal3D>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-[1400px] px-5 py-20 text-center md:px-10 md:py-28">
          <Reveal3D>
            <h2 className="text-[11vw] leading-[0.9] font-semibold tracking-[-0.05em] md:text-[6rem]">
              BUY ONE.
              <br />
              WEAR IT OUT.
            </h2>
            <div className="mt-10">
              <Link
                to="/shop"
                className="inline-flex items-center bg-primary px-10 py-4 text-sm font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-85"
              >
                Shop all products
              </Link>
            </div>
          </Reveal3D>
        </div>
      </section>
    </div>
  );
}
