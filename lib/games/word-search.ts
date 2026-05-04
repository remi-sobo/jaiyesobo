/**
 * Word search engine — pure logic. No React, no Supabase.
 * Used by the game UI (client-side grid generation per session) and
 * by tests / future preview tools.
 */

export type WordSearchDifficulty = "easy" | "medium" | "hard";

export type WordEntry = {
  word: string;
  hint: string;
};

export type WordPackPayload = {
  theme_slug: string;
  team_slug: string | null;
  title: string;
  subtitle: string;
  difficulty: WordSearchDifficulty;
  grid_size: number;
  words: WordEntry[];
};

export type Direction =
  | "horizontal"
  | "vertical"
  | "diagonal-down"
  | "diagonal-up"
  | "horizontal-reverse"
  | "vertical-reverse"
  | "diagonal-down-reverse"
  | "diagonal-up-reverse";

export type WordPlacement = {
  word: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  direction: Direction;
  cells: Array<[number, number]>;
};

export type GeneratedGrid = {
  grid: string[][];
  placements: WordPlacement[];
  unplaced: string[];
};

const DIRECTION_VECTORS: Record<Direction, [number, number]> = {
  horizontal: [0, 1],
  "horizontal-reverse": [0, -1],
  vertical: [1, 0],
  "vertical-reverse": [-1, 0],
  "diagonal-down": [1, 1],
  "diagonal-up": [-1, 1],
  "diagonal-down-reverse": [1, -1],
  "diagonal-up-reverse": [-1, -1],
};

const ALL_DIRECTIONS: Direction[] = Object.keys(DIRECTION_VECTORS) as Direction[];

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Strips spaces/hyphens, uppercases, and keeps only letters. */
export function normalizeWord(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, "");
}

export function gridSizeFor(difficulty: WordSearchDifficulty): number {
  if (difficulty === "easy") return 10;
  if (difficulty === "hard") return 18;
  return 14;
}

function emptyGrid(size: number): string[][] {
  const g: string[][] = [];
  for (let r = 0; r < size; r++) {
    g.push(new Array<string>(size).fill(""));
  }
  return g;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tryPlace(
  grid: string[][],
  word: string,
  size: number
): WordPlacement | null {
  const directions = shuffle(ALL_DIRECTIONS);
  for (const dir of directions) {
    const [dr, dc] = DIRECTION_VECTORS[dir];
    const startRows = shuffle(Array.from({ length: size }, (_, i) => i));
    const startCols = shuffle(Array.from({ length: size }, (_, i) => i));
    for (const r of startRows) {
      for (const c of startCols) {
        const endR = r + dr * (word.length - 1);
        const endC = c + dc * (word.length - 1);
        if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;

        let conflict = false;
        const cells: Array<[number, number]> = [];
        for (let i = 0; i < word.length; i++) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          const existing = grid[rr][cc];
          if (existing && existing !== word[i]) {
            conflict = true;
            break;
          }
          cells.push([rr, cc]);
        }
        if (conflict) continue;

        for (let i = 0; i < word.length; i++) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          grid[rr][cc] = word[i];
        }
        return {
          word,
          startRow: r,
          startCol: c,
          endRow: endR,
          endCol: endC,
          direction: dir,
          cells,
        };
      }
    }
  }
  return null;
}

/**
 * Generates a size×size grid containing as many of the given words as fit.
 * Words too long for the grid are dropped into `unplaced`. Empty cells are
 * filled with random letters. Re-randomizes on each call.
 */
export function generateGrid(words: string[], size: number): GeneratedGrid {
  const cleaned = words
    .map(normalizeWord)
    .filter((w) => w.length >= 2 && w.length <= size);

  // Place longest first to maximize successful placements.
  const sorted = [...cleaned].sort((a, b) => b.length - a.length);

  const grid = emptyGrid(size);
  const placements: WordPlacement[] = [];
  const unplaced: string[] = [];

  for (const w of sorted) {
    const placement = tryPlace(grid, w, size);
    if (placement) placements.push(placement);
    else unplaced.push(w);
  }

  // Fill empty cells with random letters
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) {
        grid[r][c] = ALPHA[Math.floor(Math.random() * ALPHA.length)];
      }
    }
  }

  return { grid, placements, unplaced };
}

/**
 * Given a user's drag from start to end, returns the matching placement
 * if the line is straight (horizontal, vertical, or 45°), of the correct
 * length, and matches one of the placed words. Otherwise null.
 */
export function validateSelection(
  start: [number, number],
  end: [number, number],
  placements: WordPlacement[]
): WordPlacement | null {
  for (const p of placements) {
    const matchesForward =
      p.startRow === start[0] &&
      p.startCol === start[1] &&
      p.endRow === end[0] &&
      p.endCol === end[1];
    const matchesReverse =
      p.startRow === end[0] &&
      p.startCol === end[1] &&
      p.endRow === start[0] &&
      p.endCol === start[1];
    if (matchesForward || matchesReverse) return p;
  }
  return null;
}

/**
 * Returns the cells along a straight line from start to end inclusive.
 * Returns null if the line is not a valid horizontal / vertical / 45°
 * diagonal. Used by the UI to render the live drag highlight.
 */
export function lineCells(
  start: [number, number],
  end: [number, number]
): Array<[number, number]> | null {
  const [r0, c0] = start;
  const [r1, c1] = end;
  const dr = r1 - r0;
  const dc = c1 - c0;
  const adr = Math.abs(dr);
  const adc = Math.abs(dc);
  if (!(dr === 0 || dc === 0 || adr === adc)) return null;
  const length = Math.max(adr, adc) + 1;
  const sr = adr === 0 ? 0 : dr / adr;
  const sc = adc === 0 ? 0 : dc / adc;
  const cells: Array<[number, number]> = [];
  for (let i = 0; i < length; i++) {
    cells.push([r0 + sr * i, c0 + sc * i]);
  }
  return cells;
}

/** Validate a word entry for curator submissions. */
export function validateWord(word: string): { ok: true; word: string } | { ok: false; error: string } {
  const normalized = normalizeWord(word);
  if (normalized.length < 4) return { ok: false, error: "must be at least 4 letters" };
  if (normalized.length > 12) return { ok: false, error: "must be 12 letters or fewer" };
  if (!/^[A-Z]+$/.test(normalized)) return { ok: false, error: "letters only" };
  return { ok: true, word: normalized };
}
