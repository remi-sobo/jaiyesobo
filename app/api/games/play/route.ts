import { NextResponse } from "next/server";
import { ensureCurrentSession, sessionKey } from "@/lib/games/session";
import { createServiceClient } from "@/lib/supabase/server";
import { shareToken } from "@/lib/games/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_GAMES = new Set(["top-five", "trivia", "draft", "goat-roster"]);

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { game_slug, payload } = body as { game_slug?: unknown; payload?: unknown };
  if (typeof game_slug !== "string" || !ALLOWED_GAMES.has(game_slug) || !payload || typeof payload !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const session = await ensureCurrentSession();
  const { user_id, anon_session_id } = sessionKey(session);

  const supa = createServiceClient();
  const token = shareToken();
  const { data, error } = await supa
    .from("plays")
    .insert({
      game_slug,
      user_id,
      anon_session_id,
      payload,
      result: null,
      share_token: token,
    })
    .select("id, share_token")
    .single();

  if (error || !data) {
    console.error(JSON.stringify({ scope: "games.play", err: error?.message }));
    return NextResponse.json({ error: "play_failed" }, { status: 500 });
  }

  return NextResponse.json({ play_id: data.id, share_token: data.share_token });
}
