import type { WordSearchDifficulty } from "./word-search";

export type CrosswordRoastTier = "perfect" | "strong" | "solid" | "slow" | "incomplete";

export const CROSSWORD_ROAST_LINES: Record<CrosswordRoastTier, string[]> = {
  perfect: [
    "Locked in. Every clue, every letter.",
    "Hall of Fame patience. Box score: clean.",
    "Untouchable. The grid filled itself out of fear.",
    "Pure swish. They're going to retire your jersey.",
  ],
  strong: [
    "Sharp eyes. Quick across, quick down.",
    "Real fan stuff. The clues didn't see you coming.",
    "Closer than a buzzer beater. Nice work.",
    "Solid run. The clock barely got going.",
  ],
  solid: [
    "Got every letter. No rush, no problem.",
    "Steady hand on the grid. Box score full.",
    "Methodical. Every clue eventually cracked.",
    "Not flashy. Effective. We respect it.",
  ],
  slow: [
    "Took a minute. But you finished — that counts.",
    "Marathon, not a sprint. Still a W.",
    "The clock ran. The grid filled. Good enough.",
    "Slow burn. Every clue eventually fell.",
  ],
  incomplete: [
    "A few squares got away. Run it back.",
    "Box score's missing letters. Fresh grid, fresh chance.",
    "Tough shift on this one. Try another puzzle.",
    "Halfway there. Don't quit on the rest.",
  ],
};

const TIER_THRESHOLDS: Record<WordSearchDifficulty, { perfect: number; strong: number; solid: number }> = {
  // Crosswords are slower than word-search; bump thresholds.
  easy: { perfect: 120, strong: 240, solid: 420 },
  medium: { perfect: 240, strong: 420, solid: 720 },
  hard: { perfect: 420, strong: 720, solid: 1200 },
};

export function getCrosswordRoastTier(opts: {
  difficulty: WordSearchDifficulty;
  perfect: boolean;
  time_ms: number;
}): CrosswordRoastTier {
  if (!opts.perfect) return "incomplete";
  const seconds = opts.time_ms / 1000;
  const t = TIER_THRESHOLDS[opts.difficulty];
  if (seconds <= t.perfect) return "perfect";
  if (seconds <= t.strong) return "strong";
  if (seconds <= t.solid) return "solid";
  return "slow";
}

export function getCrosswordRoastLine(opts: {
  difficulty: WordSearchDifficulty;
  perfect: boolean;
  time_ms: number;
}): { tier: CrosswordRoastTier; line: string } {
  const tier = getCrosswordRoastTier(opts);
  const lines = CROSSWORD_ROAST_LINES[tier];
  const line = lines[Math.floor(Math.random() * lines.length)];
  return { tier, line };
}

export function formatCrosswordTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
