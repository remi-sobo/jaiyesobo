"use client";

import { useEffect, useState } from "react";

/** A thin red bar across the top that fills as you read down the article. */
export default function ReadingProgress({ targetId }: { targetId: string }) {
  const [done, setDone] = useState(0);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const update = () => {
      const box = el.getBoundingClientRect();
      const total = box.height - window.innerHeight * 0.6;
      setDone(total <= 0 ? 1 : Math.min(1, Math.max(0, -box.top / total)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [targetId]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]">
      <div className="h-full origin-left bg-[var(--color-red)]" style={{ transform: `scaleX(${done})` }} />
    </div>
  );
}
