import { NextResponse } from "next/server";
import { getCurrentSession, sessionKey } from "@/lib/games/session";
import { createServiceClient } from "@/lib/supabase/server";
import type { DraftPlayPayload } from "@/lib/draft-game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Post-game claim: associate a name with a vs-Claude play so it shows up on
 * the leaderboard. Also stores the name on the anon_session so future plays
 * auto-track without prompting.
 *
 * Only the session that owns the play can claim it. No-op for plays that
 * already have player_names set (vs-friend mode, or already-claimed vs-ai).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { play_id, player_name } = body as { play_id?: unknown; player_name?: unknown };
  if (typeof play_id !== "string" || typeof player_name !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const trimmed = player_name.trim().slice(0, 24);
  if (trimmed.length === 0) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  if (trimmed.toLowerCase() === "claude") {
    return NextResponse.json({ error: "name_reserved" }, { status: 400 });
  }

  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "no_session" }, { status: 401 });
  const { user_id, anon_session_id } = sessionKey(session);

  const supa = createServiceClient();
  const { data: play } = await supa.from("plays").select("*").eq("id", play_id).maybeSingle();
  if (!play || play.game_slug !== "draft") {
    return NextResponse.json({ error: "play_not_found" }, { status: 404 });
  }

  // Only the session that owns this play can claim it.
  if (user_id && play.user_id !== user_id) {
    return NextResponse.json({ error: "not_yours" }, { status: 403 });
  }
  if (anon_session_id && play.anon_session_id !== anon_session_id) {
    return NextResponse.json({ error: "not_yours" }, { status: 403 });
  }

  const payload = play.payload as DraftPlayPayload;
  // vs-friend already has names — don't overwrite.
  if (payload.mode === "vs-friend") {
    return NextResponse.json({ ok: true, player_name: payload.player_names?.human ?? trimmed });
  }

  const newPayload: DraftPlayPayload = {
    ...payload,
    player_names: { human: trimmed, ai: "Claude" },
  };
  const { error: updErr } = await supa.from("plays").update({ payload: newPayload }).eq("id", play_id);
  if (updErr) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  // Remember the name on the session so future plays auto-track.
  if (anon_session_id) {
    await supa.from("anon_sessions").update({ display_name: trimmed }).eq("id", anon_session_id);
  }

  return NextResponse.json({ ok: true, player_name: trimmed });
}
