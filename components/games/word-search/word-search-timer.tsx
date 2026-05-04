"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/games/word-search-roasts";

type Props = {
  running: boolean;
  /** Called once per second with current elapsed ms. */
  onTick?: (ms: number) => void;
};

export default function WordSearchTimer({ running, onTick }: Props) {
  const [ms, setMs] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);

  useEffect(() => {
    if (!running) {
      if (startedAtRef.current !== null) {
        accumulatedRef.current += Date.now() - startedAtRef.current;
        startedAtRef.current = null;
      }
      return;
    }
    startedAtRef.current = Date.now();
    let mounted = true;
    let pausedByVisibility = false;

    function tick() {
      if (!mounted) return;
      const now = Date.now();
      const elapsed =
        accumulatedRef.current + (startedAtRef.current ? now - startedAtRef.current : 0);
      setMs(elapsed);
      onTick?.(elapsed);
    }
    const id = window.setInterval(tick, 250);

    function handleVis() {
      if (document.hidden) {
        if (startedAtRef.current !== null) {
          accumulatedRef.current += Date.now() - startedAtRef.current;
          startedAtRef.current = null;
          pausedByVisibility = true;
        }
      } else if (pausedByVisibility) {
        startedAtRef.current = Date.now();
        pausedByVisibility = false;
      }
    }
    document.addEventListener("visibilitychange", handleVis);

    return () => {
      mounted = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", handleVis);
      if (startedAtRef.current !== null) {
        accumulatedRef.current += Date.now() - startedAtRef.current;
        startedAtRef.current = null;
      }
    };
  }, [running, onTick]);

  return (
    <div className="font-[family-name:var(--font-jetbrains)] tabular-nums text-[var(--color-bone)] text-2xl tracking-tight">
      {formatTime(ms)}
    </div>
  );
}
