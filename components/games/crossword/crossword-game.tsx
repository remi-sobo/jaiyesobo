"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CrosswordCell,
  CrosswordLayout,
  CrosswordPlacedWord,
} from "@/lib/games/crossword";
import { formatCrosswordTime } from "@/lib/games/crossword-roasts";
import CrosswordGrid from "./crossword-grid";
import CrosswordClues from "./crossword-clues";
import CrosswordResult from "./crossword-result";

type Direction = "across" | "down";
type Selection = { row: number; col: number; direction: Direction };

type Props = {
  themeSlug: string;
  title: string;
  subtitle: string;
  difficulty: string;
  layout: CrosswordLayout;
};

type FinishResult = {
  time_ms: number;
  correct_cells: number;
  total_cells: number;
  perfect: boolean;
  tier: string;
  roast: string;
  title: string;
  streak?: { current_streak: number; longest_streak: number } | null;
};

/**
 * Main crossword play screen. Manages:
 *   - selection (current cell + direction)
 *   - filled state (user's letters)
 *   - timer (starts on first input)
 *   - keyboard input (arrows, letters, backspace, tab, space to toggle dir)
 *   - submit (POST /api/games/crossword/finish, render result)
 */
export default function CrosswordGame({
  themeSlug,
  title,
  subtitle,
  difficulty,
  layout,
}: Props) {
  const { size, grid, placed } = layout;

  // ───── Core state ─────
  const [filled, setFilled] = useState<(string | null)[][]>(() => makeBlankFilled(grid));
  const [selection, setSelection] = useState<Selection | null>(() => initialSelection(placed));
  const [playId, setPlayId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<FinishResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ───── Derived ─────
  const totalCells = useMemo(() => countLetterCells(grid), [grid]);
  const filledCount = useMemo(() => countFilled(filled, grid), [filled, grid]);
  const allFilled = filledCount === totalCells;
  const elapsedMs = startedAt ? now - startedAt : 0;

  const activeWord = useMemo(
    () => (selection ? wordCovering(grid, placed, selection) : null),
    [grid, placed, selection]
  );
  const activeWordIndex = activeWord
    ? placed.findIndex((p) => p === activeWord)
    : null;
  const activeWordCells = activeWord ? activeWord.cells : [];

  // ───── Lifecycle: start a play row on mount ─────
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    fetch("/api/games/crossword/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme_slug: themeSlug }),
    })
      .then((r) => r.json())
      .then((data: { play_id?: string; error?: string }) => {
        if (data.play_id) setPlayId(data.play_id);
        else setError(data.error ?? "Couldn't start play");
      })
      .catch(() => setError("Couldn't start play"));
  }, [themeSlug]);

  // ───── Timer ─────
  useEffect(() => {
    if (!startedAt || result) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt, result]);

  // ───── Mutators ─────
  const beginTimerIfNeeded = useCallback(() => {
    setStartedAt((s) => s ?? Date.now());
  }, []);

  const setLetter = useCallback(
    (row: number, col: number, letter: string | null) => {
      setFilled((prev) => {
        const next = prev.map((r) => r.slice());
        next[row][col] = letter;
        return next;
      });
    },
    []
  );

  const advance = useCallback(
    (sel: Selection): Selection => {
      const dr = sel.direction === "down" ? 1 : 0;
      const dc = sel.direction === "across" ? 1 : 0;
      const nextR = sel.row + dr;
      const nextC = sel.col + dc;
      if (nextR < size && nextC < size && grid[nextR][nextC] !== null) {
        return { row: nextR, col: nextC, direction: sel.direction };
      }
      return sel; // stay at end of word
    },
    [grid, size]
  );

  const moveBack = useCallback(
    (sel: Selection): Selection => {
      const dr = sel.direction === "down" ? -1 : 0;
      const dc = sel.direction === "across" ? -1 : 0;
      const prevR = sel.row + dr;
      const prevC = sel.col + dc;
      if (prevR >= 0 && prevC >= 0 && grid[prevR][prevC] !== null) {
        return { row: prevR, col: prevC, direction: sel.direction };
      }
      return sel;
    },
    [grid]
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      const cell = grid[row][col];
      if (!cell) return;
      setSelection((prev) => {
        const sameCell = prev && prev.row === row && prev.col === col;
        const hasAcross = cell.acrossWordIndex !== undefined;
        const hasDown = cell.downWordIndex !== undefined;
        if (sameCell && hasAcross && hasDown) {
          // Toggle direction at intersection
          return { row, col, direction: prev.direction === "across" ? "down" : "across" };
        }
        // Pick whichever direction the cell belongs to; prefer keeping prior direction.
        let direction: Direction;
        if (prev && prev.direction === "across" && hasAcross) direction = "across";
        else if (prev && prev.direction === "down" && hasDown) direction = "down";
        else if (hasAcross) direction = "across";
        else direction = "down";
        return { row, col, direction };
      });
    },
    [grid]
  );

  const handleClueClick = useCallback(
    (wordIndex: number) => {
      const w = placed[wordIndex];
      if (!w) return;
      setSelection({ row: w.row, col: w.col, direction: w.direction });
    },
    [placed]
  );

  // ───── Keyboard input ─────
  useEffect(() => {
    if (result) return;
    function onKey(e: KeyboardEvent) {
      if (!selection) return;
      // Ignore when typing in an input (defensive — we don't render any here)
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;

      if (e.key === " ") {
        e.preventDefault();
        // Toggle direction if at an intersection.
        const cell = grid[selection.row][selection.col];
        if (cell?.acrossWordIndex !== undefined && cell?.downWordIndex !== undefined) {
          setSelection({ ...selection, direction: selection.direction === "across" ? "down" : "across" });
        }
        return;
      }

      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        moveSelectionByArrow(e.key, selection, grid, size, setSelection);
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        const dir: Direction = e.shiftKey ? "back" as Direction : "forward" as Direction;
        void dir; // (placeholder — see below)
        const nextWord = nextClueWord(placed, selection, e.shiftKey);
        if (nextWord) setSelection({ row: nextWord.row, col: nextWord.col, direction: nextWord.direction });
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        const cur = filled[selection.row]?.[selection.col];
        if (cur) {
          setLetter(selection.row, selection.col, null);
        } else {
          const back = moveBack(selection);
          setLetter(back.row, back.col, null);
          setSelection(back);
        }
        return;
      }

      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        beginTimerIfNeeded();
        setLetter(selection.row, selection.col, e.key.toUpperCase());
        setSelection(advance(selection));
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    advance,
    beginTimerIfNeeded,
    filled,
    grid,
    moveBack,
    placed,
    result,
    selection,
    setLetter,
    size,
  ]);

  // ───── Submit ─────
  async function submit() {
    if (!playId || submitting || result) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/games/crossword/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          play_id: playId,
          time_ms: elapsedMs,
          filled,
        }),
      });
      const data = (await res.json()) as FinishResult & { error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Submit failed");
        setSubmitting(false);
        return;
      }
      setResult(data);
    } catch {
      setError("Submit failed");
      setSubmitting(false);
    }
  }

  function replay() {
    setFilled(makeBlankFilled(grid));
    setSelection(initialSelection(placed));
    setStartedAt(null);
    setNow(Date.now());
    setSubmitting(false);
    setResult(null);
    setError(null);
    startedRef.current = false;
    // Re-run start effect by remount: bump a key. Simpler — reload the page.
    // Caller handled at parent via a fresh `?r=` URL. For now we just reset
    // local state and start a NEW play row.
    fetch("/api/games/crossword/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme_slug: themeSlug }),
    })
      .then((r) => r.json())
      .then((d: { play_id?: string }) => {
        if (d.play_id) setPlayId(d.play_id);
      });
  }

  // ───── Render ─────
  if (result) {
    return <CrosswordResult result={result} onReplay={replay} />;
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-10">
      <header className="mb-8">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.3em] text-[var(--color-warm-mute)] mb-2">
          Crossword · {difficulty}
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-black text-[clamp(1.75rem,3vw,2.5rem)] tracking-[-0.02em] leading-tight">
          {title}
          <span className="italic font-normal text-[var(--color-red)]">.</span>
        </h1>
        {subtitle && (
          <p className="text-[var(--color-warm-mute)] text-sm mt-1">{subtitle}</p>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 lg:gap-12 items-start">
        <div>
          <CrosswordGrid
            size={size}
            cells={grid}
            filled={filled}
            selection={selection}
            activeWordCells={activeWordCells}
            onCellClick={handleCellClick}
          />
          <div className="mt-4 flex flex-wrap items-center gap-4 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)]">
            <span className="tabular-nums">{formatCrosswordTime(elapsedMs)}</span>
            <span>·</span>
            <span>
              {filledCount} / {totalCells}
            </span>
            {activeWord && (
              <>
                <span>·</span>
                <span className="text-[var(--color-bone)]">
                  {activeWord.number} {activeWord.direction}
                </span>
              </>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={!allFilled || submitting || !playId}
              className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-bright)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Submitting…" : allFilled ? "Submit →" : "Fill all squares"}
            </button>
          </div>
          {error && (
            <div className="mt-3 text-[var(--color-red-soft)] text-sm">{error}</div>
          )}
        </div>

        <div className="lg:max-w-[420px]">
          {activeWord && (
            <div className="bg-[var(--color-warm-surface)] border-l-2 border-[var(--color-red)] px-4 py-3 mb-6">
              <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-1">
                {activeWord.number} {activeWord.direction}
              </div>
              <div className="font-[family-name:var(--font-fraunces)] text-base leading-snug">
                {activeWord.hint}
              </div>
            </div>
          )}
          <CrosswordClues
            placed={placed}
            activeWordIndex={activeWordIndex}
            onClueClick={handleClueClick}
          />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function makeBlankFilled(grid: CrosswordCell[][]): (string | null)[][] {
  return grid.map((row) => row.map((cell) => (cell ? null : null)));
}

function countLetterCells(grid: CrosswordCell[][]): number {
  let n = 0;
  for (const row of grid) for (const cell of row) if (cell) n++;
  return n;
}

function countFilled(filled: (string | null)[][], grid: CrosswordCell[][]): number {
  let n = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] && filled[r]?.[c]) n++;
    }
  }
  return n;
}

function initialSelection(placed: CrosswordPlacedWord[]): Selection | null {
  const first = placed.slice().sort((a, b) => a.number - b.number)[0];
  if (!first) return null;
  return { row: first.row, col: first.col, direction: first.direction };
}

function wordCovering(
  grid: CrosswordCell[][],
  placed: CrosswordPlacedWord[],
  sel: Selection
): CrosswordPlacedWord | null {
  const cell = grid[sel.row]?.[sel.col];
  if (!cell) return null;
  const idx = sel.direction === "across" ? cell.acrossWordIndex : cell.downWordIndex;
  if (idx === undefined) {
    // Cell only has the other direction — fall back to that.
    const otherIdx = sel.direction === "across" ? cell.downWordIndex : cell.acrossWordIndex;
    return otherIdx !== undefined ? placed[otherIdx] : null;
  }
  return placed[idx];
}

function moveSelectionByArrow(
  key: string,
  sel: Selection,
  grid: CrosswordCell[][],
  size: number,
  setSelection: (s: Selection) => void
): void {
  const dr = key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0;
  const dc = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0;
  // Walk in (dr,dc) until we find a letter cell, or stop at edge.
  let r = sel.row + dr;
  let c = sel.col + dc;
  while (r >= 0 && r < size && c >= 0 && c < size) {
    if (grid[r][c] !== null) {
      // Switch direction to match arrow if perpendicular to current.
      const newDir: Direction =
        dr !== 0 ? "down" : "across";
      setSelection({ row: r, col: c, direction: newDir });
      return;
    }
    r += dr;
    c += dc;
  }
  // No letter cell in that direction — leave selection alone.
}

function nextClueWord(
  placed: CrosswordPlacedWord[],
  sel: Selection,
  reverse: boolean
): CrosswordPlacedWord | null {
  if (placed.length === 0) return null;
  const sorted = placed.slice().sort((a, b) =>
    a.number === b.number
      ? a.direction === b.direction
        ? 0
        : a.direction === "across"
        ? -1
        : 1
      : a.number - b.number
  );
  const currentIdx = sorted.findIndex(
    (p) => p.row === sel.row && p.col === sel.col && p.direction === sel.direction
  );
  // Find current word's index in sorted; advance/wrap.
  if (currentIdx === -1) return sorted[0];
  const next = reverse
    ? (currentIdx - 1 + sorted.length) % sorted.length
    : (currentIdx + 1) % sorted.length;
  return sorted[next];
}
