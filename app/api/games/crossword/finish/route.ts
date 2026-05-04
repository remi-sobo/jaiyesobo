import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getCrosswordRoastLine } from "@/lib/games/crossword-roasts";
import {
  bumpCrosswordStreakOnPerfect,
  getPlayableCrosswordByThemeSlug,
} from "@/lib/games/crossword-data";
import { scoreFilledGrid } from "@/lib/games/crossword";
import type { WordSearchDifficulty } from "@/lib/games/word-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  play_id?: string;
  time_ms?: number;
  /**
   * Filled grid as a 2D array of letters (or nulls for blocks/unfilled).
   * Server-validated against the canonical layout.
   */
  filled?: (string | null)[][];
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { play_id, time_ms, filled } = body;
  if (
    typeof play_id !== "string" ||
    typeof time_ms !== "number" ||
    !Number.isFinite(time_ms) ||
    !Array.isArray(filled)
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { data: play } = await supa.from("plays").select("*").eq("id", play_id).maybeSingle();
  if (!play || play.game_slug !== "crossword") {
    return NextResponse.json({ error: "play_not_found" }, { status: 404 });
  }

  // Idempotent: if already finished, return cached result.
  if (play.result && typeof play.result === "object" && "time_ms" in play.result) {
    return NextResponse.json({ ...(play.result as Record<string, unknown>), share_token: play.share_token });
  }

  const payload = play.payload as {
    theme_slug?: string;
    difficulty?: WordSearchDifficulty;
    title?: string;
  } | null;

  // Re-fetch the layout server-side so we score against the canonical answer,
  // never trust the client to send a "correct" filled grid.
  const themeSlug = payload?.theme_slug;
  if (!themeSlug) {
    return NextResponse.json({ error: "play_corrupt" }, { status: 500 });
  }
  const pack = await getPlayableCrosswordByThemeSlug(themeSlug);
  const layout = pack?.payload.crossword_grid;
  if (!layout) {
    return NextResponse.json({ error: "layout_missing" }, { status: 500 });
  }

  const difficulty: WordSearchDifficulty = payload?.difficulty ?? "medium";
  const safeTime = Math.max(0, Math.min(time_ms, 1000 * 60 * 60));
  const { correct, total, perfect } = scoreFilledGrid(layout, filled);
  const { tier, line } = getCrosswordRoastLine({ difficulty, perfect, time_ms: safeTime });

  // Bump streak on perfect runs (logged-in users only — anon sessions don't streak).
  let streak: { current_streak: number; longest_streak: number } | null = null;
  if (perfect && play.user_id) {
    const todayIso = new Date().toISOString().slice(0, 10);
    try {
      streak = await bumpCrosswordStreakOnPerfect(play.user_id, todayIso);
    } catch (err) {
      console.error(JSON.stringify({ scope: "games.crossword.finish.streak", err: String(err) }));
    }
  }

  const result = {
    time_ms: safeTime,
    correct_cells: correct,
    total_cells: total,
    perfect,
    tier,
    roast: line,
    title: payload?.title ?? "",
    difficulty,
    streak,
  };

  const newPayload = {
    ...((play.payload as Record<string, unknown>) ?? {}),
    time_ms: safeTime,
    completed_at: new Date().toISOString(),
  };

  await supa.from("plays").update({ result, payload: newPayload }).eq("id", play_id);

  return NextResponse.json({ ...result, share_token: play.share_token });
}
