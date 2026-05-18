/**
 * Blind Rank — types, validators, and shared helpers.
 *
 * A solo ranking puzzle: player picks a topic, gets 5 items revealed one at a
 * time in shuffled order, and must commit each to a slot 1..5 with no
 * take-backs. Strict positional scoring against the canonical ordering of
 * those 5 items.
 *
 * Topics live on game_content with content_type='blind_rank_topic'. Plays
 * live on the standard plays table with game_slug='blind-rank'.
 */

export const BLIND_RANK_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type BlindRankDifficulty = (typeof BLIND_RANK_DIFFICULTIES)[number];

export const POOL_MIN = 8;
export const POOL_MAX = 12;
export const ROUND_COUNT = 5;
export const SLOT_COUNT = 5;

export type BlindRankItem = {
  name: string;
  rank: number;
  fact: string;
};

export type BlindRankTopicPayload = {
  title: string;
  subtitle: string;
  category: string;
  difficulty: BlindRankDifficulty;
  pool_size: number;
  items: BlindRankItem[];
};

/** Items the server selected for this play, in reveal order. The
 *  canonical_rank is kept server-side and never serialized to the client
 *  until /finish. */
export type BlindRankPlayItem = {
  item_index: number;
  name: string;
  canonical_rank: number;
  fact: string;
};

export type BlindRankPlayPayload = {
  topic_id: string;
  topic_title: string;
  topic_subtitle: string;
  category: string;
  difficulty: BlindRankDifficulty;
  /** The 5 items chosen for this play, in REVEAL order. */
  items: BlindRankPlayItem[];
  /** Map of slot number (1..5) → item_index of the locked placement. */
  placements: Record<string, number>;
  completed_at?: string;
};

export type BlindRankSlotResult = {
  slot: number;
  player_name: string;
  ai_name: string;
  correct: boolean;
};

export type BlindRankResult = {
  score: number;
  total_slots: number;
  slot_results: BlindRankSlotResult[];
  /** Player's chosen ordering, in slot order. */
  player_ranking: { slot: number; name: string }[];
  /** Canonical correct ordering of the 5 pulled items, slot 1..5. */
  ai_ranking: { slot: number; name: string }[];
  /** Per-item context for the result reveal. */
  all_facts: {
    name: string;
    fact: string;
    ai_slot: number;
    player_slot: number;
  }[];
  verdict_line: string;
  topic_title: string;
  topic_subtitle: string;
};

export function isBlindRankDifficulty(v: unknown): v is BlindRankDifficulty {
  return (
    typeof v === "string" && (BLIND_RANK_DIFFICULTIES as readonly string[]).includes(v)
  );
}

/** Strict validator: pool_size between POOL_MIN and POOL_MAX, items match
 *  pool_size, ranks are sequential 1..N with no gaps or dupes, names + facts
 *  non-empty, names are unique. */
export function normalizeBlindRankTopicPayload(input: unknown):
  | { ok: true; payload: BlindRankTopicPayload }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "missing payload" };
  const obj = input as Record<string, unknown>;

  const title = strOrEmpty(obj.title);
  const subtitle = strOrEmpty(obj.subtitle);
  const category = strOrEmpty(obj.category) || "general";
  const difficulty = isBlindRankDifficulty(obj.difficulty) ? obj.difficulty : "medium";

  if (!title) return { ok: false, error: "title is required" };

  const rawItems = Array.isArray(obj.items) ? obj.items : [];
  const poolSizeRaw =
    typeof obj.pool_size === "number" ? obj.pool_size : rawItems.length;
  const poolSize = Math.round(poolSizeRaw);
  if (poolSize < POOL_MIN || poolSize > POOL_MAX) {
    return {
      ok: false,
      error: `pool_size must be ${POOL_MIN}–${POOL_MAX} (got ${poolSizeRaw})`,
    };
  }
  if (rawItems.length !== poolSize) {
    return {
      ok: false,
      error: `items.length (${rawItems.length}) must equal pool_size (${poolSize})`,
    };
  }

  const items: BlindRankItem[] = [];
  const seenNames = new Set<string>();
  const seenRanks = new Set<number>();
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "each item must be an object" };
    }
    const r = raw as Record<string, unknown>;
    const name = strOrEmpty(r.name);
    const fact = strOrEmpty(r.fact);
    const rank = typeof r.rank === "number" ? Math.round(r.rank) : NaN;
    if (!name) return { ok: false, error: "item name is required" };
    if (!fact) return { ok: false, error: `fact required for "${name}"` };
    if (!Number.isFinite(rank)) {
      return { ok: false, error: `numeric rank required for "${name}"` };
    }
    if (rank < 1 || rank > poolSize) {
      return {
        ok: false,
        error: `rank ${rank} for "${name}" outside 1..${poolSize}`,
      };
    }
    if (seenRanks.has(rank)) {
      return { ok: false, error: `duplicate rank ${rank}` };
    }
    const key = name.toLowerCase();
    if (seenNames.has(key)) {
      return { ok: false, error: `duplicate name: "${name}"` };
    }
    seenRanks.add(rank);
    seenNames.add(key);
    items.push({ name, rank, fact });
  }

  // Sequential ranks check (1..poolSize, no gaps).
  for (let i = 1; i <= poolSize; i++) {
    if (!seenRanks.has(i)) {
      return { ok: false, error: `missing rank ${i} (ranks must be 1..${poolSize})` };
    }
  }

  // Sort items by rank for storage consistency.
  items.sort((a, b) => a.rank - b.rank);

  return {
    ok: true,
    payload: {
      title,
      subtitle,
      category,
      difficulty,
      pool_size: poolSize,
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

/** Pick `n` distinct items at random from `arr`. */
export function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

/** Strict positional scoring. Re-rank the 5 pulled items by canonical rank
 *  (ascending), then check each player placement against that local ordering.
 *  Returns the slot-by-slot result and the integer score. */
export function scoreBlindRank(
  playItems: BlindRankPlayItem[],
  placements: Record<string, number>
): { score: number; slot_results: BlindRankSlotResult[] } {
  // Local ordering: items sorted by canonical_rank ascending. Index 0 of this
  // array is the "correct" #1 slot, index 1 is "correct" #2, etc.
  const localOrder = playItems
    .slice()
    .sort((a, b) => a.canonical_rank - b.canonical_rank);

  const slotResults: BlindRankSlotResult[] = [];
  let score = 0;
  for (let slot = 1; slot <= SLOT_COUNT; slot++) {
    const correctItem = localOrder[slot - 1];
    const playerItemIndex = placements[String(slot)];
    const playerItem = playItems.find((i) => i.item_index === playerItemIndex);
    const correct = !!playerItem && playerItem.item_index === correctItem.item_index;
    if (correct) score += 1;
    slotResults.push({
      slot,
      player_name: playerItem?.name ?? "—",
      ai_name: correctItem.name,
      correct,
    });
  }
  return { score, slot_results: slotResults };
}

/** Mike Breen-style verdict lines by score. */
export function verdictForBlindRankScore(score: number): string {
  const POOLS: Record<number, string[]> = {
    5: [
      "PERFECT BOARD! Hall of Fame eyes! UNTOUCHABLE!",
      "BANG! Five for five! That's how you do it!",
    ],
    4: [
      "Four out of five — that's a HEAT CHECK. Real fan.",
      "Four out of five! Just missed perfection!",
    ],
    3: ["Three. Respectable. Could've been four.", "Three correct. Solid night."],
    2: ["Two. The vibes were off.", "Only two. The crowd's getting restless."],
    1: ["One. The board was rigged. Or you were.", "One out of five. Bench check."],
    0: ["ZERO. Are you SURE you watched the NBA?", "Zero. Reset the whole roster."],
  };
  const pool = POOLS[score] ?? ["That happened."];
  return pool[Math.floor(Math.random() * pool.length)];
}
