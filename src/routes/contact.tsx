import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Concrete" },
      {
        name: "description",
        content: "Questions about sizing, orders or wholesale? Reach the Concrete studio.",
      },
      { property: "og:title", content: "Contact — Concrete" },
      { property: "og:description", content: "Reach the Concrete studio about orders or sizing." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <div className="mx-auto max-w-[900px] px-5 py-16 md:px-10 md:py-24">
      <h1 className="text-4xl font-semibold md:text-7xl">CONTACT</h1>
      <div className="mt-12 grid gap-px bg-border md:grid-cols-3">
        {[
          { k: "Orders", v: "orders@concrete.supply" },
          { k: "Wholesale", v: "trade@concrete.supply" },
          { k: "Studio", v: "Unit 14, Grey Yard, 09:00–17:00" },
        ].map((c) => (
          <div key={c.k} className="bg-background p-8">
            <p className="label-xs text-muted-foreground">{c.k}</p>
            <p className="mt-3">{c.v}</p>
          </div>
        ))}
      </div>
      <p className="mt-12 text-muted-foreground">
        We answer everything within one working day. Include your order number if you have one.
      </p>
    </div>
  );
}
