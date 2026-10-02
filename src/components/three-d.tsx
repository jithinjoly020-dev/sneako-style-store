import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Tilt3D — pointer-driven 3D tilt with depth shadow. Pure CSS transforms.
 */
export function Tilt3D({
  children,
  className = "",
  max = 8,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setStyle({
      transform: `perspective(900px) rotateY(${px * max}deg) rotateX(${-py * max}deg) translateZ(14px)`,
    });
  };

  const reset = () =>
    setStyle({ transform: "perspective(900px) rotateY(0deg) rotateX(0deg) translateZ(0px)" });

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ transformStyle: "preserve-3d", transition: "transform 400ms cubic-bezier(.16,1,.3,1)", ...style }}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * Reveal3D — rotates content up from depth as it scrolls into view.
 */
export function Reveal3D({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        perspective: "1200px",
        transformStyle: "preserve-3d",
        opacity: shown ? 1 : 0,
        transform: shown
          ? "rotateX(0deg) translateY(0) scale(1)"
          : "rotateX(9deg) translateY(38px) scale(0.985)",
        transition: `opacity 700ms ease ${delay}ms, transform 900ms cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Parallax3D — moves layers at different depths while scrolling.
 */
export function Parallax3D({
  children,
  speed = 0.12,
  className = "",
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2 - window.innerHeight / 2;
        setOffset(-center * speed);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [speed]);

  return (
    <div ref={ref} className={className}>
      <div style={{ transform: `translate3d(0, ${offset}px, 0)`, willChange: "transform" }}>
        {children}
      </div>
    </div>
  );
}

/**
 * PageDepth — wraps a whole page so every route enters with the same 3D flow.
 */
export function PageDepth({ children, routeKey }: { children: ReactNode; routeKey: string }) {
  // "enter" -> animating in, "done" -> plain flat layout (no 3D layers left
  // behind; a lingering 3D context made long forms like checkout freeze).
  const [phase, setPhase] = useState<"start" | "enter" | "done">("done");
  useEffect(() => {
    setPhase("start");
    const a = setTimeout(() => setPhase("enter"), 20);
    const b = setTimeout(() => setPhase("done"), 850);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [routeKey]);

  if (phase === "done") {
    // Same element tree as below so the page is not remounted.
    return (
      <div>
        <div>{children}</div>
      </div>
    );
  }

  return (
    <div style={{ perspective: "1400px", perspectiveOrigin: "50% 0%" }}>
      <div
        style={{
          opacity: phase === "enter" ? 1 : 0,
          transform: phase === "enter" ? "rotateX(0deg) translateZ(0)" : "rotateX(6deg) translateZ(-90px)",
          transition: "opacity 500ms ease, transform 800ms cubic-bezier(.16,1,.3,1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
