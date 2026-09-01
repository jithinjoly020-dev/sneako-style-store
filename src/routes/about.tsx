import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "The Studio — Concrete" },
      {
        name: "description",
        content: "Concrete is a small studio making heavyweight, unbranded cotton basics.",
      },
      { property: "og:title", content: "The Studio — Concrete" },
      {
        property: "og:description",
        content: "A small studio making heavyweight, unbranded cotton basics.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-[900px] px-5 py-16 md:px-10 md:py-24">
      <h1 className="text-4xl font-semibold md:text-7xl">THE STUDIO</h1>
      <p className="mt-10 text-xl leading-relaxed text-muted-foreground md:text-2xl">
        We make one thing properly: heavy cotton bodies that keep their shape after fifty washes.
        No seasonal churn, no logos, no story we can't back up on the label.
      </p>
      <div className="mt-16 grid gap-px bg-border md:grid-cols-2">
        {[
          {
            k: "Fabric",
            v: "240 GSM combed ring-spun cotton, garment dyed in small batches for depth of colour.",
          },
          { k: "Fit", v: "Boxy through the body with a set shoulder. Sized to wear as-is." },
          { k: "Make", v: "Cut and sewn in runs of 300. When a colour goes, it goes." },
          { k: "Care", v: "Cold wash, hang dry. It will get better, not worse." },
        ].map((b) => (
          <div key={b.k} className="bg-background p-8">
            <p className="label-xs text-muted-foreground">{b.k}</p>
            <p className="mt-3 leading-relaxed">{b.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
