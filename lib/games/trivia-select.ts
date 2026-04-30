import { createServiceClient } from "@/lib/supabase/server";
import { TRIVIA_DIFFICULTIES, type TriviaDifficultyKey } from "./trivia-config";

export type TriviaDifficulty = "easy" | "medium" | "hard" | "extreme";

export type TriviaQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  difficulty: TriviaDifficulty;
  category: string;
};

const ROUND_SIZE = 10;
const DIFFICULTIES: TriviaDifficulty[] = ["easy", "medium", "hard", "extreme"];

/**
 * Pull 10 questions from the live trivia pool, weighted by the chosen
 * difficulty profile. If a bucket runs short, fall back to the nearest
 * neighbor difficulty bucket so we always return exactly 10.
 */
export async function selectTriviaRound(
  difficulty: TriviaDifficultyKey
): Promise<TriviaQuestion[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select("id, payload")
    .eq("game_slug", "trivia")
    .eq("status", "live");
  if (error) throw error;

  const buckets: Record<TriviaDifficulty, TriviaQuestion[]> = {
    easy: [],
    medium: [],
    hard: [],
    extreme: [],
  };

  for (const row of data ?? []) {
    const p = row.payload as Record<string, unknown> | null;
    if (!p) continue;
    const diff = p.difficulty as TriviaDifficulty | undefined;
    if (!diff || !buckets[diff]) continue;
    buckets[diff].push({
      id: row.id as string,
      question: String(p.question ?? ""),
      options: Array.isArray(p.options) ? (p.options as string[]) : [],
      correct_index: typeof p.correct_index === "number" ? p.correct_index : 0,
      explanation: String(p.explanation ?? ""),
      difficulty: diff,
      category: String(p.category ?? "other"),
    });
  }

  // Shuffle each bucket so weight pulls vary round-to-round
  for (const k of DIFFICULTIES) buckets[k] = shuffle(buckets[k]);

  const weights = TRIVIA_DIFFICULTIES[difficulty].weights;
  const selected: TriviaQuestion[] = [];
  const usedIds = new Set<string>();

  for (const diff of DIFFICULTIES) {
    const want = weights[diff];
    if (want === 0) continue;
    const taken = pullFresh(buckets[diff], want, usedIds);
    selected.push(...taken);
  }

  // Fallback: if we're short of ROUND_SIZE, pull from neighbor buckets
  if (selected.length < ROUND_SIZE) {
    const remaining = ROUND_SIZE - selected.length;
    // Concat all unused questions, prefer closer-to-target difficulty
    const fillOrder = neighborOrder(difficulty);
    let still = remaining;
    for (const fbDiff of fillOrder) {
      if (still <= 0) break;
      const taken = pullFresh(buckets[fbDiff], still, usedIds);
      selected.push(...taken);
      still -= taken.length;
    }
  }

  return shuffle(selected).slice(0, ROUND_SIZE);
}

function pullFresh(
  pool: TriviaQuestion[],
  count: number,
  used: Set<string>
): TriviaQuestion[] {
  const out: TriviaQuestion[] = [];
  for (const q of pool) {
    if (out.length >= count) break;
    if (used.has(q.id)) continue;
    used.add(q.id);
    out.push(q);
  }
  return out;
}

function neighborOrder(difficulty: TriviaDifficultyKey): TriviaDifficulty[] {
  // Prefer pulling the same difficulty first, then nearest neighbors
  const idx = DIFFICULTIES.indexOf(difficulty as TriviaDifficulty);
  const order: TriviaDifficulty[] = [difficulty as TriviaDifficulty];
  let radius = 1;
  while (order.length < DIFFICULTIES.length) {
    const left = idx - radius;
    const right = idx + radius;
    if (left >= 0) order.push(DIFFICULTIES[left]);
    if (right < DIFFICULTIES.length) order.push(DIFFICULTIES[right]);
    radius++;
  }
  return order;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function getQuestionsByIds(ids: string[]): Promise<TriviaQuestion[]> {
  if (ids.length === 0) return [];
  const supa = createServiceClient();
  const { data, error } = await supa.from("game_content").select("id, payload").in("id", ids);
  if (error) throw error;
  const map = new Map<string, TriviaQuestion>();
  for (const row of data ?? []) {
    const p = row.payload as Record<string, unknown> | null;
    if (!p) continue;
    map.set(row.id as string, {
      id: row.id as string,
      question: String(p.question ?? ""),
      options: Array.isArray(p.options) ? (p.options as string[]) : [],
      correct_index: typeof p.correct_index === "number" ? p.correct_index : 0,
      explanation: String(p.explanation ?? ""),
      difficulty: (p.difficulty ?? "medium") as TriviaDifficulty,
      category: String(p.category ?? "other"),
    });
  }
  // Preserve original order
  return ids.map((id) => map.get(id)).filter((q): q is TriviaQuestion => !!q);
}
