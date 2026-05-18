import { NextResponse } from "next/server";
import { ensureCurrentSession, sessionKey } from "@/lib/games/session";
import { createServiceClient } from "@/lib/supabase/server";
import { shareToken } from "@/lib/games/data";
import { pickRandomVerifiedCutSet } from "@/lib/games/the-cut-data";
import { isCutGameMode, shuffle, type CutPlayPayload } from "@/lib/games/the-cut";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const mode = (body as { mode?: unknown }).mode;
  if (!isCutGameMode(mode)) {
    return NextResponse.json({ error: "missing_or_invalid_mode" }, { status: 400 });
  }

  const set = await pickRandomVerifiedCutSet();
  if (!set) {
    return NextResponse.json(
      { error: "no_puzzles_ready", message: "No puzzles ready yet — Jaiye is curating more" },
      { status: 503 }
    );
  }

  const session = await ensureCurrentSession();
  const { user_id, anon_session_id } = sessionKey(session);

  // Server-side shuffle. is_keep + fact intentionally NOT included in the
  // client response — only revealed after /lock.
  const shuffledItems = shuffle(set.payload.items);
  const shuffledNames = shuffledItems.map((i) => i.name);

  const supa = createServiceClient();
  const token = shareToken();
  const payload: CutPlayPayload = {
    set_id: set.id,
    mode,
    set_title: set.payload.title,
    category: set.payload.category,
    set_difficulty: set.payload.difficulty,
    criterion_summary: set.payload.criterion_summary,
    shuffled_names: shuffledNames,
  };

  const { data, error } = await supa
    .from("plays")
    .insert({
      game_slug: "the-cut",
      user_id,
      anon_session_id,
      payload,
      result: null,
      share_token: token,
    })
    .select("id, share_token")
    .single();

  if (error || !data) {
    console.error(JSON.stringify({ scope: "games.the-cut.start", err: error?.message }));
    return NextResponse.json({ error: "play_failed" }, { status: 500 });
  }

  return NextResponse.json({
    play_id: data.id,
    share_token: data.share_token,
    set_title: set.payload.title,
    category: set.payload.category,
    mode,
    // Criterion + easy_prompt ONLY sent in easy mode. Hard mode hides it
    // until reveal.
    prompt: mode === "easy" ? set.payload.easy_prompt : set.payload.hard_prompt,
    criterion: mode === "easy" ? set.payload.criterion_summary : null,
    items: shuffledNames.map((name) => ({ name })),
  });
}
