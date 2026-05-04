import { createServiceClient } from "@/lib/supabase/server";
import type { WordPackPayload, WordSearchDifficulty } from "./word-search";
import { gridSizeFor, normalizeWord, validateWord } from "./word-search";

export type WordPackRow = {
  id: string;
  game_slug: "word-search";
  content_type: "word_pack";
  status: "draft" | "live" | "archived" | "community_submitted";
  draft_team_slug: string | null;
  verification_status: "pending" | "verified" | "rejected";
  payload: WordPackPayload;
  created_at: string;
};

export type TeamPackSummary = {
  team_slug: string;
  team_label: string;
  total: number;
  drafts: number;
  verified: number;
  rejected: number;
};

const DIFFICULTIES: WordSearchDifficulty[] = ["easy", "medium", "hard"];

export function isDifficulty(v: unknown): v is WordSearchDifficulty {
  return typeof v === "string" && (DIFFICULTIES as string[]).includes(v);
}

/** Light validation + normalization for a curator-edited pack payload. */
export function normalizePackPayload(input: unknown): {
  ok: true;
  payload: WordPackPayload;
} | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "missing payload" };
  const obj = input as Record<string, unknown>;

  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const subtitle = typeof obj.subtitle === "string" ? obj.subtitle.trim() : "";
  const themeSlug = typeof obj.theme_slug === "string" ? obj.theme_slug.trim() : "";
  const teamSlug =
    typeof obj.team_slug === "string" && obj.team_slug.trim().length > 0
      ? obj.team_slug.trim()
      : null;
  const difficulty = isDifficulty(obj.difficulty) ? obj.difficulty : "medium";
  const wordsRaw = Array.isArray(obj.words) ? obj.words : [];

  if (!title) return { ok: false, error: "title is required" };
  if (!themeSlug) return { ok: false, error: "theme_slug is required" };
  if (wordsRaw.length === 0) return { ok: false, error: "at least one word required" };

  const seen = new Set<string>();
  const words: WordPackPayload["words"] = [];
  for (const w of wordsRaw) {
    if (!w || typeof w !== "object") continue;
    const entry = w as Record<string, unknown>;
    const wordRaw = typeof entry.word === "string" ? entry.word : "";
    const hint = typeof entry.hint === "string" ? entry.hint.trim() : "";
    const v = validateWord(wordRaw);
    if (!v.ok) return { ok: false, error: `"${wordRaw}": ${v.error}` };
    if (seen.has(v.word)) continue;
    seen.add(v.word);
    words.push({ word: v.word, hint });
  }
  if (words.length === 0) return { ok: false, error: "no valid words after normalization" };

  const gridSize = gridSizeFor(difficulty);
  const tooLong = words.find((w) => w.word.length > gridSize);
  if (tooLong) {
    return {
      ok: false,
      error: `"${tooLong.word}" is longer than the ${difficulty} grid (${gridSize}). Pick a longer difficulty or a shorter word.`,
    };
  }

  // Preserve a previously-generated crossword grid through PATCH if the
  // client sent it back unchanged. If the curator edited words, the verify
  // UI is expected to NOT include `crossword_grid` in the body — that's
  // how staleness is signalled (grid clears, "Regenerate" button reappears).
  const cw = obj.crossword_grid;
  const preservedGrid =
    cw && typeof cw === "object" && Array.isArray((cw as { grid?: unknown }).grid)
      ? (cw as WordPackPayload["crossword_grid"])
      : undefined;

  return {
    ok: true,
    payload: {
      theme_slug: themeSlug,
      team_slug: teamSlug,
      title,
      subtitle,
      difficulty,
      grid_size: gridSize,
      words,
      ...(preservedGrid ? { crossword_grid: preservedGrid } : {}),
    },
  };
}

export async function getAllWordPacks(): Promise<WordPackRow[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select("id, game_slug, content_type, status, draft_team_slug, verification_status, payload, created_at")
    .eq("game_slug", "word-search")
    .eq("content_type", "word_pack")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as WordPackRow[];
}

export async function getLiveWordPacks(): Promise<WordPackRow[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select("id, game_slug, content_type, status, draft_team_slug, verification_status, payload, created_at")
    .eq("game_slug", "word-search")
    .eq("content_type", "word_pack")
    .eq("status", "live")
    .eq("verification_status", "verified")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as WordPackRow[];
}

export async function getWordPackById(id: string): Promise<WordPackRow | null> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select("id, game_slug, content_type, status, draft_team_slug, verification_status, payload, created_at")
    .eq("id", id)
    .eq("game_slug", "word-search")
    .eq("content_type", "word_pack")
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as WordPackRow) ?? null;
}

export async function getWordPackByThemeSlug(themeSlug: string): Promise<WordPackRow | null> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select("id, game_slug, content_type, status, draft_team_slug, verification_status, payload, created_at")
    .eq("game_slug", "word-search")
    .eq("content_type", "word_pack")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as WordPackRow[];
  return rows.find((r) => r.payload?.theme_slug === themeSlug) ?? null;
}

/** Slug-ify a free-form theme name. */
export function slugifyTheme(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export { normalizeWord };
