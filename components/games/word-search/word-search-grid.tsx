"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { lineCells, validateSelection, type WordPlacement } from "@/lib/games/word-search";

type Props = {
  grid: string[][];
  placements: WordPlacement[];
  foundWords: Set<string>;
  onFound: (placement: WordPlacement) => void;
};

export default function WordSearchGrid({ grid, placements, foundWords, onFound }: Props) {
  const size = grid.length;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [start, setStart] = useState<[number, number] | null>(null);
  const [end, setEnd] = useState<[number, number] | null>(null);
  const [shake, setShake] = useState(false);

  // Cells already locked in by found words. Map<"r,c", true>
  const foundCells = useMemo(() => {
    const set = new Set<string>();
    for (const p of placements) {
      if (foundWords.has(p.word)) {
        for (const [r, c] of p.cells) set.add(`${r},${c}`);
      }
    }
    return set;
  }, [placements, foundWords]);

  // Live drag highlight cells
  const dragCells = useMemo(() => {
    if (!start || !end) return new Set<string>();
    const cells = lineCells(start, end);
    if (!cells) return new Set<string>();
    return new Set(cells.map(([r, c]) => `${r},${c}`));
  }, [start, end]);

  function cellFromPoint(x: number, y: number): [number, number] | null {
    const target = document.elementFromPoint(x, y);
    if (!target) return null;
    const cell = (target as HTMLElement).closest<HTMLElement>("[data-rc]");
    if (!cell) return null;
    const rc = cell.dataset.rc;
    if (!rc) return null;
    const [r, c] = rc.split(",").map(Number);
    return [r, c];
  }

  function beginAt(point: [number, number]) {
    setStart(point);
    setEnd(point);
  }

  function moveTo(point: [number, number] | null) {
    if (!start || !point) return;
    setEnd(point);
  }

  function release() {
    if (start && end) {
      const match = validateSelection(start, end, placements);
      if (match && !foundWords.has(match.word)) {
        onFound(match);
      } else if (!match && start[0] !== end[0]) {
        setShake(true);
        setTimeout(() => setShake(false), 250);
      } else if (!match && start[1] !== end[1]) {
        setShake(true);
        setTimeout(() => setShake(false), 250);
      }
    }
    setStart(null);
    setEnd(null);
  }

  // Keyboard: ESC clears the in-progress drag.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setStart(null);
        setEnd(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`select-none touch-none ${shake ? "animate-[shake_0.25s_ease-in-out]" : ""}`}
      onMouseLeave={() => {
        if (start) release();
      }}
    >
      <div
        className="grid gap-[2px] mx-auto"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          maxWidth: `min(92vw, ${size * 44}px)`,
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          const pt = cellFromPoint(t.clientX, t.clientY);
          if (pt) beginAt(pt);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          const pt = cellFromPoint(t.clientX, t.clientY);
          moveTo(pt);
        }}
        onTouchEnd={() => release()}
        onTouchCancel={() => release()}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const key = `${r},${c}`;
            const isFound = foundCells.has(key);
            const isDrag = dragCells.has(key);
            return (
              <button
                key={key}
                type="button"
                data-rc={key}
                onMouseDown={(e) => {
                  e.preventDefault();
                  beginAt([r, c]);
                }}
                onMouseEnter={() => {
                  if (start) setEnd([r, c]);
                }}
                onMouseUp={() => release()}
                className={`aspect-square flex items-center justify-center font-[family-name:var(--font-jetbrains)] font-bold uppercase rounded-[3px] transition-colors
                  ${
                    isFound
                      ? "bg-[var(--color-red)]/35 text-[var(--color-bone)]"
                      : isDrag
                      ? "bg-[var(--color-red)]/55 text-[var(--color-bone)]"
                      : "bg-[var(--color-card)] text-[var(--color-bone)] hover:bg-[var(--color-off-black)]"
                  }
                  text-[clamp(0.75rem,2.4vw,1.15rem)] leading-none`}
                style={{ touchAction: "none" }}
                aria-label={`Row ${r + 1}, column ${c + 1}, letter ${letter}`}
              >
                {letter}
              </button>
            );
          })
        )}
      </div>
      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-6px);
          }
          50% {
            transform: translateX(5px);
          }
          75% {
            transform: translateX(-3px);
          }
        }
      `}</style>
    </div>
  );
}
