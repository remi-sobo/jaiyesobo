"use client";

import type { CrosswordCell } from "@/lib/games/crossword";

type Selection = { row: number; col: number; direction: "across" | "down" };

type Props = {
  size: number;
  /** Canonical layout (non-mutating) — used for cell shape + numbers. */
  cells: CrosswordCell[][];
  /** User-entered letters (or null) — same shape as `cells`. */
  filled: (string | null)[][];
  selection: Selection | null;
  /** Cells covered by the active word (for highlight). */
  activeWordCells: Array<[number, number]>;
  onCellClick: (row: number, col: number) => void;
};

/**
 * Pure grid renderer. All input handling happens at the page level via
 * keyboard listeners — clicking a cell only sets selection.
 *
 * Visual rules:
 *   - block (null cell)            → solid black square
 *   - letter cell (not selected)   → bone bg, optional small clue number
 *   - cells in active word         → red-tinted bg
 *   - the actively-selected cell   → red bg, bone text
 */
export default function CrosswordGrid({
  size,
  cells,
  filled,
  selection,
  activeWordCells,
  onCellClick,
}: Props) {
  const activeSet = new Set(activeWordCells.map(([r, c]) => `${r}:${c}`));

  return (
    <div
      className="inline-grid border border-[var(--color-line)] bg-[var(--color-line)] gap-px select-none"
      style={{
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
      }}
      role="grid"
      aria-label="Crossword grid"
    >
      {Array.from({ length: size }).map((_, r) =>
        Array.from({ length: size }).map((__, c) => {
          const cell = cells[r][c];
          if (!cell) {
            return (
              <div
                key={`${r}-${c}`}
                className="aspect-square w-9 sm:w-10 md:w-11 bg-[var(--color-black)]"
                aria-hidden
              />
            );
          }
          const isSelected =
            selection && selection.row === r && selection.col === c;
          const isInActiveWord = activeSet.has(`${r}:${c}`);
          const letter = filled[r]?.[c] ?? "";
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              onClick={() => onCellClick(r, c)}
              role="gridcell"
              aria-label={`Row ${r + 1} column ${c + 1}${cell.number ? `, clue ${cell.number}` : ""}`}
              className={`relative aspect-square w-9 sm:w-10 md:w-11 font-[family-name:var(--font-fraunces)] text-[1rem] sm:text-[1.1rem] md:text-[1.25rem] font-semibold uppercase transition-colors
                ${
                  isSelected
                    ? "bg-[var(--color-red)] text-[var(--color-bone)]"
                    : isInActiveWord
                    ? "bg-[var(--color-red)]/20 text-[var(--color-bone)]"
                    : "bg-[var(--color-warm-bg)] text-[var(--color-bone)] hover:bg-[var(--color-warm-surface)]"
                }`}
            >
              {cell.number !== undefined && (
                <span className="absolute top-[1px] left-[2px] font-[family-name:var(--font-jetbrains)] text-[0.5rem] leading-none text-[var(--color-warm-mute)]">
                  {cell.number}
                </span>
              )}
              {letter}
            </button>
          );
        })
      )}
    </div>
  );
}
