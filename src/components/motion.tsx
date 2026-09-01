import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/** useInView — one-shot intersection flag. */
export function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/** SplitText — word-by-word mask reveal, the signature Framer-site headline motion. */
export function SplitText({
  text,
  className = "",
  delay = 0,
  stagger = 45,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  as?: "span" | "h1" | "h2" | "h3" | "p";
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  const words = useMemo(() => text.split(" "), [text]);

  return (
    <Tag className={className}>
      <span ref={ref} className="inline">
        {words.map((w, i) => (
          <span
            key={`${w}-${i}`}
            className="inline-block overflow-hidden align-bottom"
            style={{ paddingBottom: "0.08em" }}
          >
            <span
              className="inline-block"
              style={{
                transform: inView ? "translateY(0) rotateX(0deg)" : "translateY(105%) rotateX(35deg)",
                opacity: inView ? 1 : 0,
                transition: `transform 900ms cubic-bezier(.16,1,.3,1) ${delay + i * stagger}ms, opacity 700ms ease ${delay + i * stagger}ms`,
              }}
            >
              {w}
              {i < words.length - 1 ? "\u00A0" : ""}
            </span>
          </span>
        ))}
      </span>
    </Tag>
  );
}

/** Marquee — infinite horizontal ticker. */
export function Marquee({
  items,
  speed = 32,
  reverse = false,
  className = "",
}: {
  items: string[];
  speed?: number;
  reverse?: boolean;
  className?: string;
}) {
  const row = [...items, ...items];
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className="flex w-max gap-12 whitespace-nowrap will-change-transform"
        style={{
          animation: `marquee ${speed}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {row.map((t, i) => (
          <span key={i} className="label-xs flex items-center gap-12 text-muted-foreground">
            {t}
            <span aria-hidden className="text-foreground/40">
              /
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Magnetic — element leans toward the cursor. */
export function Magnetic({
  children,
  strength = 0.28,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [t, setT] = useState({ x: 0, y: 0 });
  return (
    <span
      ref={ref}
      className={`inline-block ${className}`}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setT({
          x: (e.clientX - (r.left + r.width / 2)) * strength,
          y: (e.clientY - (r.top + r.height / 2)) * strength,
        });
      }}
      onMouseLeave={() => setT({ x: 0, y: 0 })}
      style={{
        transform: `translate3d(${t.x}px, ${t.y}px, 0)`,
        transition: "transform 500ms cubic-bezier(.16,1,.3,1)",
      }}
    >
      {children}
    </span>
  );
}

/** ScrollScrub — maps element progress through the viewport to a 0..1 value. */
export function useScrollScrub<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const total = r.height + window.innerHeight;
        setP(Math.min(1, Math.max(0, (window.innerHeight - r.top) / total)));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return { ref, progress: p };
}

/** ScaleReveal — image scales/unmasks as it scrolls through the viewport. */
export function ScaleReveal({
  children,
  className = "",
  from = 1.18,
}: {
  children: ReactNode;
  className?: string;
  from?: number;
}) {
  const { ref, progress } = useScrollScrub<HTMLDivElement>();
  const scale = from - (from - 1) * Math.min(1, progress * 1.6);
  const style: CSSProperties = {
    transform: `scale(${scale})`,
    willChange: "transform",
  };
  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <div style={style}>{children}</div>
    </div>
  );
}

/** ScrollProgress — thin top bar tracking page scroll. */
export function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setP(h > 0 ? window.scrollY / h : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-foreground"
      style={{ transform: `scaleX(${p})`, transition: "transform 120ms linear" }}
    />
  );
}

/** Counter — counts up when scrolled into view. */
export function Counter({
  to,
  suffix = "",
  className = "",
}: {
  to: number;
  suffix?: string;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1200);
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to]);
  return (
    <span ref={ref} className={className}>
      {n.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}
