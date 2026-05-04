import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getRoastLine } from "@/lib/games/word-search-roasts";
import type { WordSearchDifficulty } from "@/lib/games/word-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  play_id?: string;
  time_ms?: number;
  words_found?: string[];
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { play_id, time_ms, words_found } = body;
  if (
    typeof play_id !== "string" ||
    typeof time_ms !== "number" ||
    !Number.isFinite(time_ms) ||
    !Array.isArray(words_found)
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { data: play } = await supa.from("plays").select("*").eq("id", play_id).maybeSingle();
  if (!play || play.game_slug !== "word-search") {
    return NextResponse.json({ error: "play_not_found" }, { status: 404 });
  }

  // Idempotent: if already finished, return cached result
  if (play.result && typeof play.result === "object" && "time_ms" in play.result) {
    return NextResponse.json({ ...(play.result as Record<string, unknown>), share_token: play.share_token });
  }

  const payload = play.payload as {
    words?: string[];
    difficulty?: WordSearchDifficulty;
    title?: string;
  } | null;
  const totalWords = payload?.words?.length ?? 0;
  const difficulty: WordSearchDifficulty = payload?.difficulty ?? "medium";

  // Validate words_found is a subset of the pack's words
  const allowed = new Set((payload?.words ?? []).map((w) => w.toUpperCase()));
  const cleanFound = Array.from(
    new Set(words_found.map((w) => String(w).toUpperCase()).filter((w) => allowed.has(w)))
  );

  const perfect = totalWords > 0 && cleanFound.length === totalWords;
  const safeTime = Math.max(0, Math.min(time_ms, 1000 * 60 * 60));
  const { tier, line } = getRoastLine({ difficulty, perfect, time_ms: safeTime });

  const result = {
    time_ms: safeTime,
    words_found: cleanFound,
    words_found_count: cleanFound.length,
    total_words: totalWords,
    perfect,
    tier,
    roast: line,
    title: payload?.title ?? "",
    difficulty,
  };

  const newPayload = {
    ...((play.payload as Record<string, unknown>) ?? {}),
    words_found: cleanFound,
    time_ms: safeTime,
    completed_at: new Date().toISOString(),
  };

  await supa.from("plays").update({ result, payload: newPayload }).eq("id", play_id);

  return NextResponse.json({ ...result, share_token: play.share_token });
}
