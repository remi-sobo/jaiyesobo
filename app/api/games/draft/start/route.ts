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

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { team_slug } = body as { team_slug?: unknown };
  if (typeof team_slug !== "string" || team_slug.trim().length === 0) {
    return NextResponse.json({ error: "missing_team_slug" }, { status: 400 });
  }

  const team = await getDraftTeamBySlug(team_slug);
  if (!team) {
    return NextResponse.json({ error: "team_not_found" }, { status: 404 });
  }

  const supa = createServiceClient();

  // Pull verified player pool. Need ~30+ to make a draft viable.
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

  // Coin flip
  const starts: DraftSide = Math.random() < 0.5 ? "human" : "ai";

  const session = await ensureCurrentSession();
  const { user_id, anon_session_id } = sessionKey(session);

  // If we already know the player's name (from a prior claim), auto-track
  // this draft so it shows up on the leaderboard without a post-game prompt.
  const knownName: string | null =
    session.kind === "anon" && session.session.display_name
      ? session.session.display_name
      : session.kind === "auth"
      ? session.user.display_name
      : null;

  const initialPayload: DraftPlayPayload = {
    team_slug,
    team: team.payload,
    starts,
    picks: [],
    mode: "vs-ai",
    ...(knownName ? { player_names: { human: knownName, ai: "Claude" } } : {}),
  };

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
    known_name: knownName,
  });
}
