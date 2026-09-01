import { useRef, useState } from "react";

export type CollectibleCardProps = {
  index: string;
  name: string;
  edition: string;
  image: string;
  spec: string;
};

/**
 * CollectibleCard — cinematic 3D digital collectible: beveled metallic edge,
 * translucent glass layers, glowing border accent and soft ambient light.
 */
export function CollectibleCard({ index, name, edition, image, spec }: CollectibleCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ rx: 0, ry: 0, gx: 50, gy: 30, active: false });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setT({ rx: -(py - 0.5) * 14, ry: (px - 0.5) * 16, gx: px * 100, gy: py * 100, active: true });
  };

  const reset = () => setT({ rx: 0, ry: 0, gx: 50, gy: 30, active: false });

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className="relative [perspective:1200px]"
    >
      <div
        className="relative aspect-[3/4] w-full [transform-style:preserve-3d]"
        style={{
          transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg) translateZ(${t.active ? 18 : 0}px)`,
          transition: "transform 500ms cubic-bezier(.16,1,.3,1)",
        }}
      >
        {/* ambient glow behind the card */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-8 blur-3xl transition-opacity duration-700"
          style={{
            opacity: t.active ? 0.55 : 0.22,
            background:
              "radial-gradient(60% 50% at 50% 40%, color-mix(in oklab, var(--color-foreground) 26%, transparent), transparent 70%)",
          }}
        />

        {/* beveled metallic edge */}
        <div
          className="absolute inset-0 p-px"
          style={{
            background:
              "linear-gradient(145deg, color-mix(in oklab, var(--color-foreground) 55%, transparent), color-mix(in oklab, var(--color-accent) 40%, transparent) 35%, transparent 55%, color-mix(in oklab, var(--color-foreground) 35%, transparent))",
            boxShadow: t.active
              ? "0 40px 80px -30px rgb(0 0 0 / 0.85), 0 0 0 1px color-mix(in oklab, var(--color-foreground) 22%, transparent)"
              : "0 30px 60px -35px rgb(0 0 0 / 0.8)",
            transition: "box-shadow 500ms ease",
          }}
        >
          {/* glass body */}
          <div className="relative h-full w-full overflow-hidden bg-surface/70 backdrop-blur-xl">
            <img
              src={image}
              alt={name}
              loading="lazy"
              className="absolute inset-0 size-full object-cover opacity-80"
              style={{ transform: "translateZ(0)" }}
            />
            {/* light rays */}
            <div
              aria-hidden
              className="absolute inset-0 mix-blend-screen opacity-40"
              style={{
                background:
                  "linear-gradient(105deg, transparent 30%, color-mix(in oklab, var(--color-foreground) 18%, transparent) 45%, transparent 58%)",
              }}
            />
            {/* cursor sheen */}
            <div
              aria-hidden
              className="absolute inset-0 transition-opacity duration-300"
              style={{
                opacity: t.active ? 1 : 0,
                background: `radial-gradient(35% 30% at ${t.gx}% ${t.gy}%, color-mix(in oklab, var(--color-foreground) 30%, transparent), transparent 70%)`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

            {/* glowing inner border accent */}
            <div
              aria-hidden
              className="absolute inset-3 border transition-all duration-500"
              style={{
                borderColor: `color-mix(in oklab, var(--color-foreground) ${t.active ? 45 : 20}%, transparent)`,
                boxShadow: t.active
                  ? "inset 0 0 30px color-mix(in oklab, var(--color-foreground) 14%, transparent), 0 0 18px color-mix(in oklab, var(--color-foreground) 12%, transparent)"
                  : "none",
              }}
            />

            {/* floating type layer */}
            <div
              className="absolute inset-0 flex flex-col justify-between p-6"
              style={{ transform: "translateZ(40px)" }}
            >
              <div className="flex items-start justify-between">
                <p className="label-xs text-muted-foreground">{index}</p>
                <p className="label-xs text-muted-foreground">{edition}</p>
              </div>
              <div>
                <h3 className="text-2xl font-semibold tracking-[-0.03em]">{name}</h3>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {spec}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
