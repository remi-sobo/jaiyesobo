/**
 * Data layer for the Crossword game.
 *
 * Crosswords reuse the existing `word_pack` content type. The generated
 * crossword layout is stored on the pack's `payload.crossword_grid`. A
 * pack is "playable as a crossword" when its grid exists and the pack
 * is live + verified.
 */
import { createServiceClient } from "@/lib/supabase/server";
import type { WordPackPayload } from "./word-search";
import type { CrosswordLayout } from "./crossword";

export type CrosswordPackRow = {
  id: string;
  payload: WordPackPayload & { crossword_grid?: CrosswordLayout };
  created_at: string;
};

/** Live + verified packs that have a generated crossword grid. */
export async function getPlayableCrosswords(): Promise<CrosswordPackRow[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select("id, payload, created_at")
    .eq("game_slug", "word-search")
    .eq("content_type", "word_pack")
    .eq("status", "live")
    .eq("verification_status", "verified")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as CrosswordPackRow[];
  return rows.filter((r) => !!r.payload.crossword_grid);
}

/** Fetch one pack by theme_slug, ONLY if it has a crossword grid + is live. */
export async function getPlayableCrosswordByThemeSlug(
  themeSlug: string
): Promise<CrosswordPackRow | null> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select("id, payload, created_at")
    .eq("game_slug", "word-search")
    .eq("content_type", "word_pack")
    .eq("status", "live")
    .eq("verification_status", "verified");
  if (error) throw error;
  const rows = (data ?? []) as unknown as CrosswordPackRow[];
  return rows.find((r) => r.payload.theme_slug === themeSlug && !!r.payload.crossword_grid) ?? null;
}

/** Streak row for crosswords. */
export type CrosswordStreak = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  last_completed_at: string | null;
};

export async function getCrosswordStreak(userId: string): Promise<CrosswordStreak | null> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("crossword_streaks")
    .select("user_id, current_streak, longest_streak, last_completed_date, last_completed_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as CrosswordStreak | null) ?? null;
}

/**
 * Bump the streak after a perfect crossword. Increments current_streak if
 * the previous completion was yesterday; resets to 1 if older or first
 * time. Updates longest_streak if current pushes past it.
 */
export async function bumpCrosswordStreakOnPerfect(userId: string, todayIso: string): Promise<{
  current_streak: number;
  longest_streak: number;
}> {
  const supa = createServiceClient();
  const existing = await getCrosswordStreak(userId);

  let newCurrent = 1;
  if (existing?.last_completed_date) {
    if (existing.last_completed_date === todayIso) {
      // Already counted today — keep streak as-is.
      newCurrent = existing.current_streak;
    } else {
      const yesterday = new Date(`${todayIso}T00:00:00`);
      yesterday.setDate(yesterday.getDate() - 1);
      const ymd = yesterday.toISOString().slice(0, 10);
      newCurrent = existing.last_completed_date === ymd ? existing.current_streak + 1 : 1;
    }
  }
  const newLongest = Math.max(existing?.longest_streak ?? 0, newCurrent);

  const { error } = await supa
    .from("crossword_streaks")
    .upsert(
      {
        user_id: userId,
        current_streak: newCurrent,
        longest_streak: newLongest,
        last_completed_date: todayIso,
        last_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (error) throw error;
  return { current_streak: newCurrent, longest_streak: newLongest };
}
