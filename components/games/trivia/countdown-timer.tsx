"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  durationMs: number;
  /** Tick is fired with the remaining ms each animation frame. */
  onTick?: (remainingMs: number) => void;
  onTimeout: () => void;
  /** Re-mount when this value changes to reset the timer. */
  resetKey: string | number;
  /** When true, freezes the timer where it is (e.g. answer locked). */
  paused?: boolean;
};

export default function CountdownTimer({ durationMs, onTick, onTimeout, resetKey, paused }: Props) {
  const [remaining, setRemaining] = useState(durationMs);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const timedOutRef = useRef(false);
  const accumPausedRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);

  useEffect(() => {
    timedOutRef.current = false;
    setRemaining(durationMs);
    startRef.current = null;
    accumPausedRef.current = 0;
    pausedAtRef.current = null;

    function tick(now: number) {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current - accumPausedRef.current;
      const rem = Math.max(0, durationMs - elapsed);
      setRemaining(rem);
      onTick?.(rem);
      if (rem <= 0 && !timedOutRef.current) {
        timedOutRef.current = true;
        onTimeout();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    function handleVisibility() {
      if (document.hidden) {
        if (pausedAtRef.current === null) pausedAtRef.current = performance.now();
      } else {
        if (pausedAtRef.current !== null) {
          accumPausedRef.current += performance.now() - pausedAtRef.current;
          pausedAtRef.current = null;
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, durationMs]);

  useEffect(() => {
    if (paused && pausedAtRef.current === null) {
      pausedAtRef.current = performance.now();
    } else if (!paused && pausedAtRef.current !== null) {
      accumPausedRef.current += performance.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
  }, [paused]);

  const pct = Math.max(0, Math.min(100, (remaining / durationMs) * 100));
  const seconds = Math.ceil(remaining / 1000);

  let color = "var(--color-games-green)";
  if (pct <= 20) color = "var(--color-red)";
  else if (pct <= 50) color = "var(--color-games-yellow)";

  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <div className="flex-1 h-2 bg-[var(--color-card)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-100 ease-linear"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span
        className="font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.15em] tabular-nums w-8 text-right"
        style={{ color }}
      >
        {seconds}s
      </span>
    </div>
  );
}
