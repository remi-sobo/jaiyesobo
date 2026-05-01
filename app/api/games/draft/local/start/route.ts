import { NextResponse } from "next/server";
import { ensureCurrentSession, sessionKey } from "@/lib/games/session";
import { createServiceClient } from "@/lib/supabase/server";
import { shareToken } from "@/lib/games/data";
import { getDraftTeamBySlug } from "@/lib/draft-data";
import {
  type DraftPlayPayload,
  type DraftPoolPlayer,
  type DraftSide,
  toPoolPlayer,
} from "@/lib/draft-game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Start a 2-player local hot-seat draft. Same engine as /start, but:
 *  - mode = "vs-friend"
 *  - player_names persisted on the play
 *  - coin flip is between p1 and p2 (mapped to side="human"|"ai")
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { team_slug, p1_name, p2_name } = body as {
    team_slug?: unknown;
    p1_name?: unknown;
    p2_name?: unknown;
  };
  if (typeof team_slug !== "string" || team_slug.trim().length === 0) {
    return NextResponse.json({ error: "missing_team_slug" }, { status: 400 });
  }
  const p1 = sanitizeName(p1_name, "Player 1");
  const p2 = sanitizeName(p2_name, "Player 2");
  if (p1.toLowerCase() === p2.toLowerCase()) {
    return NextResponse.json({ error: "duplicate_names" }, { status: 400 });
  }

  const team = await getDraftTeamBySlug(team_slug);
  if (!team) {
    return NextResponse.json({ error: "team_not_found" }, { status: 404 });
  }

  const supa = createServiceClient();
  const { data: pool, error: poolErr } = await supa
    .from("game_content")
    .select("id, payload")
    .eq("game_slug", "draft")
    .eq("content_type", "draft_player")
    .eq("draft_team_slug", team_slug)
    .eq("verification_status", "verified")
    .eq("status", "live");
  if (poolErr) {
    return NextResponse.json({ error: "pool_failed" }, { status: 500 });
  }
  if (!pool || pool.length < 12) {
    return NextResponse.json(
      { error: "pool_too_small", count: pool?.length ?? 0 },
      { status: 400 }
    );
  }

  const poolPlayers: DraftPoolPlayer[] = pool.map((r) =>
    toPoolPlayer(
      (r as { id: string }).id,
      (r as { payload: import("@/lib/draft-data").DraftPlayerPayload }).payload
    )
  );

  // Coin flip — random which player goes first
  const starts: DraftSide = Math.random() < 0.5 ? "human" : "ai";

  const initialPayload: DraftPlayPayload = {
    team_slug,
    team: team.payload,
    starts,
    picks: [],
    mode: "vs-friend",
    player_names: { human: p1, ai: p2 },
  };

  const session = await ensureCurrentSession();
  const { user_id, anon_session_id } = sessionKey(session);

  // Remember player 1's name on the session so future vs-Claude games auto-track.
  // Fire-and-forget — failure here doesn't block the draft.
  if (anon_session_id) {
    void supa.from("anon_sessions").update({ display_name: p1 }).eq("id", anon_session_id);
  }

  const token = shareToken();
  const { data: play, error: playErr } = await supa
    .from("plays")
    .insert({
      game_slug: "draft",
      user_id,
      anon_session_id,
      payload: initialPayload,
      result: null,
      share_token: token,
    })
    .select("id, share_token")
    .single();

  if (playErr || !play) {
    return NextResponse.json({ error: "play_failed" }, { status: 500 });
  }

  return NextResponse.json({
    play_id: play.id,
    share_token: play.share_token,
    team: team.payload,
    starts,
    pool: poolPlayers,
    player_names: { human: p1, ai: p2 },
  });
}

function sanitizeName(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim().slice(0, 24);
  return trimmed.length === 0 ? fallback : trimmed;
}
