/**
 * Crossword engine — pure logic. No React, no Supabase.
 *
 * Takes a word pack's word list (already normalized to UPPERCASE A–Z by
 * the word-search validator) and produces a deterministic crossword
 * layout: a grid of cells (letter or block), the placed words with their
 * row/col/direction/clue-number, and any words that couldn't be placed.
 *
 * Algorithm: greedy backtracking placer.
 *   1. Sort words longest-first (most-constraining-first), tiebreak alpha.
 *   2. Place the first word horizontally near the middle of the grid.
 *   3. For each subsequent word, find every legal placement that
 *      intersects an existing letter; pick the one that creates the most
 *      intersections (denser puzzle), tiebroken by stable scan order.
 *   4. Words that have no legal placement are dropped (returned in
 *      `dropped` so the curator can see what fell off).
 *   5. Number cells in row-major scan order (1, 2, 3, …) at every cell
 *      that starts an across or down word.
 *
 * The placer is deterministic — same input ⇒ same grid.
 */
import type { WordSearchDifficulty } from "./word-search";

export type CrosswordDirection = "across" | "down";

export type CrosswordCell = {
  /** UPPERCASE single letter. */
  letter: string;
  /** 1-indexed clue number if this cell starts an across or down word. */
  number?: number;
  /** Index into placedWords[] for the across word covering this cell. */
  acrossWordIndex?: number;
  /** Index into placedWords[] for the down word covering this cell. */
  downWordIndex?: number;
} | null;

export type CrosswordPlacedWord = {
  word: string;
  hint: string;
  row: number;
  col: number;
  direction: CrosswordDirection;
  /** Clue number assigned in numbering pass. */
  number: number;
  /** Inclusive list of cells covered, in word order. */
  cells: Array<[number, number]>;
};

export type CrosswordLayout = {
  size: number;
  /** size × size, row-major; null = block. */
  grid: CrosswordCell[][];
  placed: CrosswordPlacedWord[];
  dropped: { word: string; hint: string; reason: string }[];
};

export type WordWithHint = { word: string; hint: string };

/** Grid sizing for crosswords. Slightly looser than word-search to allow
 * room for off-axis intersections; words are still ≤12 chars. */
export function crosswordSizeFor(difficulty: WordSearchDifficulty): number {
  if (difficulty === "easy") return 11;
  if (difficulty === "hard") return 19;
  return 15;
}

const EMPTY_LAYOUT_REASON = "no intersection with placed words";
const TOO_LONG_REASON = "longer than the grid";
const NO_FIRST_WORD_REASON = "grid couldn't fit the first word";

/**
 * Lay out the given words into a size×size crossword grid.
 * Inputs are assumed to be UPPERCASE letters only (validateWord from
 * word-search has already enforced this).
 */
export function generateCrossword(
  words: WordWithHint[],
  size: number
): CrosswordLayout {
  // Filter trivially-too-long words up front; sort longest-first then alpha.
  const fitting: WordWithHint[] = [];
  const dropped: { word: string; hint: string; reason: string }[] = [];
  for (const w of words) {
    if (w.word.length > size) {
      dropped.push({ word: w.word, hint: w.hint, reason: TOO_LONG_REASON });
    } else {
      fitting.push(w);
    }
  }
  fitting.sort((a, b) =>
    b.word.length - a.word.length || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0)
  );

  const grid: CrosswordCell[][] = makeEmptyGrid(size);
  const placed: CrosswordPlacedWord[] = [];

  if (fitting.length === 0) {
    return { size, grid, placed, dropped };
  }

  // Seed with the first (longest) word, horizontal, roughly centered.
  const first = fitting[0];
  const seedRow = Math.floor(size / 2);
  const seedCol = Math.floor((size - first.word.length) / 2);
  if (seedCol < 0 || seedCol + first.word.length > size) {
    dropped.push({ word: first.word, hint: first.hint, reason: NO_FIRST_WORD_REASON });
  } else {
    placeOnGrid(grid, first, seedRow, seedCol, "across", placed.length);
    placed.push({
      word: first.word,
      hint: first.hint,
      row: seedRow,
      col: seedCol,
      direction: "across",
      number: 0, // numbered in pass below
      cells: cellsFor(seedRow, seedCol, "across", first.word.length),
    });
  }

  // Place remaining words.
  for (let idx = 1; idx < fitting.length; idx++) {
    const w = fitting[idx];
    const candidate = bestCandidatePlacement(grid, w.word, size);
    if (!candidate) {
      dropped.push({ word: w.word, hint: w.hint, reason: EMPTY_LAYOUT_REASON });
      continue;
    }
    const wordIndex = placed.length;
    placeOnGrid(grid, w, candidate.row, candidate.col, candidate.direction, wordIndex);
    placed.push({
      word: w.word,
      hint: w.hint,
      row: candidate.row,
      col: candidate.col,
      direction: candidate.direction,
      number: 0,
      cells: cellsFor(candidate.row, candidate.col, candidate.direction, w.word.length),
    });
  }

  numberCells(grid, placed, size);

  return { size, grid, placed, dropped };
}

// ────────────────────────────────────────────────────────────────────────
// Internals
// ────────────────────────────────────────────────────────────────────────

function makeEmptyGrid(size: number): CrosswordCell[][] {
  const g: CrosswordCell[][] = [];
  for (let r = 0; r < size; r++) g.push(new Array<CrosswordCell>(size).fill(null));
  return g;
}

function inBounds(r: number, c: number, size: number): boolean {
  return r >= 0 && r < size && c >= 0 && c < size;
}

function cellsFor(
  row: number,
  col: number,
  direction: CrosswordDirection,
  length: number
): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < length; i++) {
    out.push(direction === "across" ? [row, col + i] : [row + i, col]);
  }
  return out;
}

function placeOnGrid(
  grid: CrosswordCell[][],
  w: WordWithHint,
  row: number,
  col: number,
  direction: CrosswordDirection,
  wordIndex: number
): void {
  for (let i = 0; i < w.word.length; i++) {
    const r = direction === "across" ? row : row + i;
    const c = direction === "across" ? col + i : col;
    const existing = grid[r][c];
    if (existing) {
      grid[r][c] = {
        ...existing,
        ...(direction === "across"
          ? { acrossWordIndex: wordIndex }
          : { downWordIndex: wordIndex }),
      };
    } else {
      grid[r][c] = {
        letter: w.word[i],
        ...(direction === "across"
          ? { acrossWordIndex: wordIndex }
          : { downWordIndex: wordIndex }),
      };
    }
  }
}

/**
 * Find the best legal placement for `word`. Score = number of
 * intersections with existing letters (more = denser puzzle).
 * Returns null if no legal placement exists.
 *
 * Iterates all (existing letter cell) × (matching letter in word) pairs;
 * for each, tries placing the word so the matching letter aligns with
 * the existing cell, in both across and down. Validates each candidate.
 *
 * Stable iteration order ⇒ deterministic output.
 */
function bestCandidatePlacement(
  grid: CrosswordCell[][],
  word: string,
  size: number
):
  | { row: number; col: number; direction: CrosswordDirection }
  | null {
  let best: {
    row: number;
    col: number;
    direction: CrosswordDirection;
    intersections: number;
  } | null = null;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (!cell) continue;
      const cellLetter = cell.letter;
      for (let i = 0; i < word.length; i++) {
        if (word[i] !== cellLetter) continue;
        // Try across: word[0] at (r, c-i)
        const acrossRow = r;
        const acrossCol = c - i;
        const acrossInter = countLegalIntersections(
          grid,
          word,
          acrossRow,
          acrossCol,
          "across",
          size
        );
        if (acrossInter !== null) {
          if (!best || acrossInter > best.intersections) {
            best = {
              row: acrossRow,
              col: acrossCol,
              direction: "across",
              intersections: acrossInter,
            };
          }
        }
        // Try down: word[0] at (r-i, c)
        const downRow = r - i;
        const downCol = c;
        const downInter = countLegalIntersections(
          grid,
          word,
          downRow,
          downCol,
          "down",
          size
        );
        if (downInter !== null) {
          if (!best || downInter > best.intersections) {
            best = {
              row: downRow,
              col: downCol,
              direction: "down",
              intersections: downInter,
            };
          }
        }
      }
    }
  }

  if (!best) return null;
  return { row: best.row, col: best.col, direction: best.direction };
}

/**
 * Returns the number of intersections with existing letters if the
 * placement is legal. Returns null if illegal.
 *
 * Legal requires:
 *   • all cells in bounds
 *   • the cell immediately before the start, and immediately after the
 *     end, in the word's direction is empty/off-grid (no run-on)
 *   • for each cell of the word:
 *       - if empty: cells perpendicular to the word direction must be
 *         empty (no parallel adjacency creating a 2-letter false word)
 *       - if filled: letter must match AND the existing cell is not
 *         already covered by a word in this same direction (no parallel
 *         overlap)
 *   • at least one intersection (we already require this to even be
 *     considered, but bootstrap case is handled by the caller seeding
 *     the first word manually)
 */
function countLegalIntersections(
  grid: CrosswordCell[][],
  word: string,
  row: number,
  col: number,
  direction: CrosswordDirection,
  size: number
): number | null {
  const length = word.length;
  const dr = direction === "down" ? 1 : 0;
  const dc = direction === "across" ? 1 : 0;

  const endR = row + dr * (length - 1);
  const endC = col + dc * (length - 1);
  if (!inBounds(row, col, size) || !inBounds(endR, endC, size)) return null;

  // The cells just before and just after the word, along the word axis,
  // must be empty (or off-grid).
  const beforeR = row - dr;
  const beforeC = col - dc;
  const afterR = endR + dr;
  const afterC = endC + dc;
  if (inBounds(beforeR, beforeC, size) && grid[beforeR][beforeC] !== null) return null;
  if (inBounds(afterR, afterC, size) && grid[afterR][afterC] !== null) return null;

  let intersections = 0;
  for (let i = 0; i < length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const existing = grid[r][c];

    if (existing) {
      if (existing.letter !== word[i]) return null;
      // Parallel overlap forbidden — the existing cell must NOT already
      // be covered by a word in the SAME direction we're placing.
      if (direction === "across" && existing.acrossWordIndex !== undefined) return null;
      if (direction === "down" && existing.downWordIndex !== undefined) return null;
      intersections++;
    } else {
      // Newly-filled cell: cells perpendicular must be empty.
      const perpDr = direction === "across" ? 1 : 0;
      const perpDc = direction === "across" ? 0 : 1;
      const n1R = r + perpDr;
      const n1C = c + perpDc;
      const n2R = r - perpDr;
      const n2C = c - perpDc;
      if (inBounds(n1R, n1C, size) && grid[n1R][n1C] !== null) return null;
      if (inBounds(n2R, n2C, size) && grid[n2R][n2C] !== null) return null;
    }
  }

  if (intersections === 0) return null;
  return intersections;
}

/**
 * Row-major scan; assign 1-indexed clue numbers to cells that start an
 * across or down word, and write the number both onto the grid cell and
 * onto the matching placedWords[] entries.
 */
function numberCells(
  grid: CrosswordCell[][],
  placed: CrosswordPlacedWord[],
  size: number
): void {
  let next = 1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (!cell) continue;
      const startsAcross =
        (c === 0 || grid[r][c - 1] === null) &&
        c + 1 < size &&
        grid[r][c + 1] !== null;
      const startsDown =
        (r === 0 || grid[r - 1][c] === null) &&
        r + 1 < size &&
        grid[r + 1][c] !== null;
      if (!startsAcross && !startsDown) continue;
      cell.number = next;
      // Find the placed words starting here and stamp the number on them.
      for (const p of placed) {
        if (p.row === r && p.col === c) p.number = next;
      }
      next++;
    }
  }
}

/**
 * Verifies a fully-filled grid against the placed words. Returns:
 *   - correct: number of cells whose user-letter matches the answer
 *   - total: total non-null cells
 *   - perfect: correct === total
 */
export function scoreFilledGrid(
  layout: CrosswordLayout,
  filled: (string | null)[][]
): { correct: number; total: number; perfect: boolean } {
  let correct = 0;
  let total = 0;
  for (let r = 0; r < layout.size; r++) {
    for (let c = 0; c < layout.size; c++) {
      const cell = layout.grid[r][c];
      if (!cell) continue;
      total++;
      const guess = filled[r]?.[c];
      if (typeof guess === "string" && guess.toUpperCase() === cell.letter) {
        correct++;
      }
    }
  }
  return { correct, total, perfect: correct === total && total > 0 };
}
