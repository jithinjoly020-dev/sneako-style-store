import { createFileRoute, Link } from "@tanstack/react-router";
import { EditableBackground, EditableText } from "@/lib/site-content";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Comfort Hub" },
      {
        name: "description",
        content:
          "Reach the Comfort Hub studio about orders, sizing, returns, repairs or wholesale. We answer every message within one working day.",
      },
      { property: "og:title", content: "Contact — Comfort Hub" },
      {
        property: "og:description",
        content: "Orders, sizing, returns, repairs and wholesale — reach the Comfort Hub studio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

const channels = [
  {
    k: "Orders & delivery",
    v: "orders@comforthub.store",
    d: "Tracking, address changes, delayed parcels. Include your order number (UL-XXXX).",
  },
  {
    k: "Returns & repairs",
    v: "care@comforthub.store",
    d: "14-day returns on unworn pieces. Split seams restitched free within a year.",
  },
  {
    k: "Wholesale & stockists",
    v: "trade@comforthub.store",
    d: "Minimum 60 pieces per run. Line sheet and terms sent within a day.",
  },
];

const faqs = [
  {
    q: "How long does delivery take?",
    a: "Standard is 4–6 working days anywhere in India and free over ₹2,999. Express is 1–2 working days. Studio pickup is ready within 24 hours.",
  },
  {
    q: "Which payments do you accept?",
    a: "UPI, cards and netbanking through Paytm — every prepaid order gets 5% off. Cash on delivery is available at full price.",
  },
  {
    q: "Can I change or cancel an order?",
    a: "Yes, until it is packed. Email orders@comforthub.store with your order number and we will stop it at the studio.",
  },
  {
    q: "What if the size is wrong?",
    a: "One free size exchange per order within 14 days, as long as the piece is unworn and unwashed with the tab intact.",
  },
];

function Contact() {
  return (
    <EditableBackground contentKey="contact.hero" className="mx-auto max-w-[1000px] px-5 py-16 md:px-10 md:py-24">
      <EditableText as="p" contentKey="contact.eyebrow" fallback="Talk to us" className="label-xs text-muted-foreground" />
      <EditableText as="h1" contentKey="contact.title" fallback="CONTACT" className="mt-4 text-4xl font-semibold md:text-7xl" />
      <EditableText as="p" contentKey="contact.intro" fallback="A real person reads every message. We answer within one working day, usually much sooner." className="mt-8 max-w-[680px] text-xl leading-relaxed text-muted-foreground" />

      <div className="mt-12 grid gap-px bg-border md:grid-cols-3">
        {channels.map((c) => (
          <div key={c.k} className="bg-background p-8">
            <p className="label-xs text-muted-foreground">{c.k}</p>
            <a href={`mailto:${c.v}`} className="mt-3 block underline underline-offset-4">
              {c.v}
            </a>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-px bg-border md:grid-cols-2">
        <div className="bg-background p-8">
          <p className="label-xs text-muted-foreground">Studio</p>
          <p className="mt-3 leading-relaxed">
            Unit 14, Grey Yard
            <br />
            Tiruppur, Tamil Nadu 641604
            <br />
            India
          </p>
          <p className="label-xs mt-4 text-muted-foreground">
            Visits by appointment · Mon–Sat, 09:00–17:00 IST
          </p>
        </div>
        <div className="bg-background p-8">
          <p className="label-xs text-muted-foreground">Response times</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>Email — within one working day</li>
            <li>WhatsApp +91 90000 00000 — 10:00–18:00 IST</li>
            <li>Instagram DMs — checked twice a day</li>
            <li>Wholesale enquiries — same day, with a line sheet</li>
          </ul>
        </div>
      </div>

      <EditableText as="h2" contentKey="contact.questions" fallback="COMMON QUESTIONS" className="mt-24 text-2xl font-semibold md:text-4xl" />
      <div className="mt-8 border-t border-border">
        {faqs.map((f) => (
          <details key={f.q} className="group border-b border-border py-5">
            <summary className="cursor-pointer list-none text-sm font-medium">{f.q}</summary>
            <p className="mt-3 max-w-[720px] text-sm leading-relaxed text-muted-foreground">
              {f.a}
            </p>
          </details>
        ))}
      </div>

      <div className="mt-16 flex flex-wrap gap-4">
        <Link to="/shop" className="bg-primary px-6 py-3 text-sm text-primary-foreground">
          Shop the run
        </Link>
        <Link to="/about" className="border border-border px-6 py-3 text-sm">
          About the studio
        </Link>
      </div>
    </EditableBackground>
  );
}
