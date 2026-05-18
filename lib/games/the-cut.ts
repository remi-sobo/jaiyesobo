/**
 * The Cut — types, validators, and shared helpers.
 *
 * A "Keep 4 / Cut 4" puzzle: 8 items, exactly 4 satisfy a hidden criterion
 * (is_keep=true) and 4 are plausible distractors (is_keep=false).
 *
 * Cut sets live on game_content with content_type='cut_set'. Plays live on
 * the standard plays table with game_slug='the-cut'.
 */

export const CUT_SET_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type CutSetDifficulty = (typeof CUT_SET_DIFFICULTIES)[number];

export const CUT_GAME_MODES = ["easy", "hard"] as const;
/** Game-play mode: 'easy' shows the criterion, 'hard' hides it. Independent
 *  from the underlying set's difficulty. */
export type CutGameMode = (typeof CUT_GAME_MODES)[number];

export const REQUIRED_KEEPS = 4;
export const REQUIRED_CUTS = 4;
export const TOTAL_ITEMS = REQUIRED_KEEPS + REQUIRED_CUTS;

export type CutSetItem = {
  name: string;
  is_keep: boolean;
  fact: string;
};

export type CutSetPayload = {
  title: string;
  easy_prompt: string;
  hard_prompt: string;
  category: string;
  difficulty: CutSetDifficulty;
  criterion_summary: string;
  items: CutSetItem[];
};

export type CutPlayPayload = {
  set_id: string;
  mode: CutGameMode;
  set_title: string;
  category: string;
  set_difficulty: CutSetDifficulty;
  criterion_summary: string;
  /** Shuffled, server-side order. Sent to the client without is_keep. */
  shuffled_names: string[];
  kept_names?: string[];
  completed_at?: string;
};

export type CutPlayResult = {
  score: number;
  total_keeps: number;
  correct_keeps: string[];
  wrong_keeps: string[];
  missed_keeps: string[];
  all_items_with_facts: CutSetItem[];
  criterion_summary: string;
  set_title: string;
  mode: CutGameMode;
  verdict_line: string;
};

export function isCutSetDifficulty(v: unknown): v is CutSetDifficulty {
  return typeof v === "string" && (CUT_SET_DIFFICULTIES as readonly string[]).includes(v);
}

export function isCutGameMode(v: unknown): v is CutGameMode {
  return typeof v === "string" && (CUT_GAME_MODES as readonly string[]).includes(v);
}

/** Strict validator: every set MUST have exactly 4 keeps and 4 cuts, with
 *  non-empty names and facts. Returns the normalized payload on success. */
export function normalizeCutSetPayload(input: unknown):
  | { ok: true; payload: CutSetPayload }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "missing payload" };
  const obj = input as Record<string, unknown>;

  const title = strOrEmpty(obj.title);
  const easyPrompt = strOrEmpty(obj.easy_prompt);
  const hardPrompt = strOrEmpty(obj.hard_prompt) || "Four of these belong together. Find them.";
  const category = strOrEmpty(obj.category) || "general";
  const difficulty = isCutSetDifficulty(obj.difficulty) ? obj.difficulty : "medium";
  const criterionSummary = strOrEmpty(obj.criterion_summary);

  if (!title) return { ok: false, error: "title is required" };
  if (!easyPrompt) return { ok: false, error: "easy_prompt is required" };
  if (!criterionSummary) return { ok: false, error: "criterion_summary is required" };

  const rawItems = Array.isArray(obj.items) ? obj.items : [];
  if (rawItems.length !== TOTAL_ITEMS) {
    return { ok: false, error: `items must have exactly ${TOTAL_ITEMS} entries (got ${rawItems.length})` };
  }

  const items: CutSetItem[] = [];
  const seenNames = new Set<string>();
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "each item must be an object" };
    }
    const r = raw as Record<string, unknown>;
    const name = strOrEmpty(r.name);
    const fact = strOrEmpty(r.fact);
    const isKeep = typeof r.is_keep === "boolean" ? r.is_keep : null;
    if (!name) return { ok: false, error: "item name is required" };
    if (!fact) return { ok: false, error: `fact required for "${name}"` };
    if (isKeep === null) return { ok: false, error: `is_keep boolean required for "${name}"` };
    const key = name.toLowerCase();
    if (seenNames.has(key)) return { ok: false, error: `duplicate name: "${name}"` };
    seenNames.add(key);
    items.push({ name, is_keep: isKeep, fact });
  }

  const keepCount = items.filter((i) => i.is_keep).length;
  const cutCount = items.length - keepCount;
  if (keepCount !== REQUIRED_KEEPS) {
    return { ok: false, error: `exactly ${REQUIRED_KEEPS} keeps required (got ${keepCount})` };
  }
  if (cutCount !== REQUIRED_CUTS) {
    return { ok: false, error: `exactly ${REQUIRED_CUTS} cuts required (got ${cutCount})` };
  }

  return {
    ok: true,
    payload: {
      title,
      easy_prompt: easyPrompt,
      hard_prompt: hardPrompt,
      category,
      difficulty,
      criterion_summary: criterionSummary,
      items,
    },
  };
}

function strOrEmpty(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Fisher-Yates shuffle. Returns a new array. */
export function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** One-line verdict in Fraunces serif voice, based on score. */
export function verdictForScore(score: number): string {
  const POOLS: Record<number, string[]> = {
    4: ["Hall of Fame eyes.", "You knew it.", "Untouchable.", "Locked in."],
    3: ["Close. Real close.", "Almost perfect.", "One got away."],
    2: ["Coin flip energy.", "Could've been worse. Could've been better."],
    1: ["Tough one.", "Run it back."],
    0: ["Not your night.", "Reverse psychology king.", "Wrong on every guess."],
  };
  const pool = POOLS[score] ?? ["That happened."];
  return pool[Math.floor(Math.random() * pool.length)];
}
