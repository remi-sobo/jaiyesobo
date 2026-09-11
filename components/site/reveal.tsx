"use client";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * A scroll-triggered entrance that fires once and never replays.
 *
 * The hidden state is CSS, not an inline style, which matters twice over:
 * the server can't know whether a visitor prefers reduced motion, and a
 * JS-driven `opacity: 0` in the server HTML would leave whole sections
 * invisible for anyone whose preference is "reduce" or whose JS never runs.
 * A media query and the `<noscript>` rule in the root layout both handle
 * that in CSS instead. See `[data-reveal]` in globals.css.
 */
export default function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Under reduced motion the CSS never hides it, so there's nothing to do.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -80px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-reveal data-shown={shown || undefined} className={className}>
      {children}
    </div>
  );
}
