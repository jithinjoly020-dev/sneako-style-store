import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "The Studio — unlabelled" },
      {
        name: "description",
        content:
          "unlabelled is a small Indian studio making 240 GSM heavyweight cotton basics in runs of 300 — no logos, no seasons, no filler.",
      },
      { property: "og:title", content: "The Studio — unlabelled" },
      {
        property: "og:description",
        content: "How unlabelled sources, cuts and finishes heavyweight cotton basics in India.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

const specs = [
  {
    k: "Fabric",
    v: "240 GSM combed ring-spun cotton, knitted in Tiruppur and garment dyed in small batches so the colour sits deep in the yarn instead of on top of it.",
  },
  {
    k: "Fit",
    v: "Boxy through the body with a set shoulder and a slightly dropped armhole. Sized to wear straight out of the bag — no break-in period, no shrink allowance games.",
  },
  {
    k: "Make",
    v: "Cut and sewn in runs of 300 with twin-needle hems, taped shoulder seams and a ribbed collar knitted from the same yarn as the body so it never grows.",
  },
  {
    k: "Care",
    v: "Cold machine wash inside out, hang dry in shade, warm iron if you must. Fifty washes in it should look lived-in, not tired.",
  },
];

const timeline = [
  { y: "Day 1–3", t: "Yarn selected", d: "Combed cotton lots checked for staple length and evenness before knitting." },
  { y: "Day 4–9", t: "Knit & dye", d: "Tubular knitting, then reactive garment dyeing in 60-piece lots." },
  { y: "Day 10–16", t: "Cut & sew", d: "Panels cut by hand, sewn by a nine-person line we have worked with since day one." },
  { y: "Day 17–20", t: "QC & pack", d: "Every piece measured at four points. Rejects become studio samples, never seconds sales." },
];

const values = [
  { k: "No logos", v: "Nothing on the outside. The only mark is a woven size tab in the side seam." },
  { k: "No seasons", v: "One catalogue, restocked. When a colour sells out it stays out until the yarn is right." },
  { k: "Honest pricing", v: "Direct from the studio. No distributor margin, no fake MRP to discount against." },
  { k: "Repair first", v: "Send a split seam back within a year and we restitch it free, both ways paid." },
];

function About() {
  return (
    <div className="mx-auto max-w-[1000px] px-5 py-16 md:px-10 md:py-24">
      <p className="label-xs text-muted-foreground">The studio</p>
      <h1 className="mt-4 text-4xl font-semibold md:text-7xl">MADE PLAINLY</h1>
      <p className="mt-10 max-w-[720px] text-xl leading-relaxed text-muted-foreground md:text-2xl">
        unlabelled makes one thing properly: heavy cotton bodies that keep their shape after fifty
        washes. No seasonal churn, no logos, no story we can't back up on the label.
      </p>

      <div className="mt-16 grid gap-px bg-border md:grid-cols-2">
        {specs.map((b) => (
          <div key={b.k} className="bg-background p-8">
            <p className="label-xs text-muted-foreground">{b.k}</p>
            <p className="mt-3 leading-relaxed">{b.v}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-24 text-2xl font-semibold md:text-4xl">HOW A RUN IS MADE</h2>
      <div className="mt-10 border-t border-border">
        {timeline.map((s) => (
          <div
            key={s.y}
            className="grid gap-2 border-b border-border py-6 md:grid-cols-[140px_200px_1fr] md:items-baseline"
          >
            <span className="label-xs font-mono text-muted-foreground">{s.y}</span>
            <span className="text-sm font-medium">{s.t}</span>
            <span className="text-sm leading-relaxed text-muted-foreground">{s.d}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-24 text-2xl font-semibold md:text-4xl">WHAT WE HOLD TO</h2>
      <div className="mt-10 grid gap-px bg-border md:grid-cols-2">
        {values.map((v) => (
          <div key={v.k} className="bg-background p-8">
            <p className="label-xs text-muted-foreground">{v.k}</p>
            <p className="mt-3 leading-relaxed">{v.v}</p>
          </div>
        ))}
      </div>

      <div className="mt-24 border border-border bg-surface p-8 md:p-12">
        <h2 className="text-2xl font-semibold md:text-4xl">SIZING, PLAINLY</h2>
        <p className="mt-4 max-w-[640px] leading-relaxed text-muted-foreground">
          Measurements are flat, in inches, taken on a finished garment. If you are between sizes,
          take the smaller one for a clean shoulder or the larger one for a true box fit.
        </p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="label-xs text-left text-muted-foreground">
                <th className="py-2">Size</th>
                <th className="py-2">Chest</th>
                <th className="py-2">Length</th>
                <th className="py-2">Shoulder</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {[
                ["S", "20", "27", "17.5"],
                ["M", "21.5", "28", "18.5"],
                ["L", "23", "29", "19.5"],
                ["XL", "24.5", "30", "20.5"],
              ].map((r) => (
                <tr key={r[0]} className="border-t border-border">
                  {r.map((c) => (
                    <td key={c} className="py-2.5">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link to="/shop" className="bg-primary px-6 py-3 text-sm text-primary-foreground">
            Shop the run
          </Link>
          <Link to="/contact" className="border border-border px-6 py-3 text-sm">
            Ask the studio
          </Link>
        </div>
      </div>
    </div>
  );
}
