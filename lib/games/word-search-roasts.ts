import type { WordSearchDifficulty } from "./word-search";

export type RoastTier = "perfect" | "strong" | "solid" | "slow" | "incomplete";

export const WORD_SEARCH_ROAST_LINES: Record<RoastTier, string[]> = {
  perfect: [
    "Locked in. Every word, every time.",
    "Pure swish. The grid never had a chance.",
    "MVP eyes. Hall of Fame patience.",
    "Untouchable. They're going to retire your jersey.",
  ],
  strong: [
    "Nice eyes. Keep that pace.",
    "Quick scan, clean kill. Real fan stuff.",
    "Closer than the playoffs. Sharp work.",
    "Solid run. The clock barely got a quarter in.",
  ],
  solid: [
    "Got 'em all. No rush, no problem.",
    "Steady hand. Box score full.",
    "Not flashy. Effective. We respect it.",
    "Methodical. Every word, hunted down.",
  ],
  slow: [
    "Took a minute. But you finished. That counts.",
    "Marathon, not a sprint. Still a W.",
    "The clock ran. The board cleared. Good enough.",
    "Slow burn. Every word eventually fell.",
  ],
  incomplete: [
    "Some words got away. Run it back.",
    "Box score's missing a few. Fresh grid, fresh chance.",
    "Tough shift. Hit the gym and try another pack.",
    "Halfway there. Don't quit on the rest.",
  ],
};

/** Tier thresholds scale with difficulty. Numbers in seconds. */
const TIER_THRESHOLDS: Record<WordSearchDifficulty, { perfect: number; strong: number; solid: number }> = {
  easy: { perfect: 60, strong: 120, solid: 240 },
  medium: { perfect: 90, strong: 180, solid: 360 },
  hard: { perfect: 150, strong: 300, solid: 540 },
};

export function getRoastTier(opts: {
  difficulty: WordSearchDifficulty;
  perfect: boolean;
  time_ms: number;
}): RoastTier {
  if (!opts.perfect) return "incomplete";
  const seconds = opts.time_ms / 1000;
  const t = TIER_THRESHOLDS[opts.difficulty];
  if (seconds <= t.perfect) return "perfect";
  if (seconds <= t.strong) return "strong";
  if (seconds <= t.solid) return "solid";
  return "slow";
}

export function getRoastLine(opts: {
  difficulty: WordSearchDifficulty;
  perfect: boolean;
  time_ms: number;
}): { tier: RoastTier; line: string } {
  const tier = getRoastTier(opts);
  const lines = WORD_SEARCH_ROAST_LINES[tier];
  const line = lines[Math.floor(Math.random() * lines.length)];
  return { tier, line };
}

/** "1:23" / "12:05" format. */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
