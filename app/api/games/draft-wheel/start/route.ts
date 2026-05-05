import { NextResponse } from "next/server";
import { ensureCurrentSession, sessionKey } from "@/lib/games/session";
import { createServiceClient } from "@/lib/supabase/server";
import { shareToken } from "@/lib/games/data";
import { getDraftTeamSummaries } from "@/lib/draft-data";
import {
  buildInitialRounds,
  type DraftWheelPlayPayload,
  type WheelPlayerNames,
} from "@/lib/games/draft-wheel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_VERIFIED_PER_TEAM = 12;

/**
 * Start a Draft Wheel game.
 *
 *   Body: { p1_name, p2_name }
 *   Returns: { play_id, share_token, available_teams: [{slug, team}], player_names }
 *
 * Available teams are franchises with ≥ MIN_VERIFIED_PER_TEAM verified players —
 * same threshold the Draft Room uses. Client doesn't see the spin order; the
 * server picks 2 teams per round on /spin.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { p1_name, p2_name } = body as { p1_name?: unknown; p2_name?: unknown };
  const a = sanitizeName(p1_name, "Player 1");
  const b = sanitizeName(p2_name, "Player 2");
  if (a.toLowerCase() === b.toLowerCase()) {
    return NextResponse.json({ error: "duplicate_names" }, { status: 400 });
  }

  // Eligible team pool (verified ≥ threshold).
  const summaries = await getDraftTeamSummaries();
  const eligible = summaries.filter((s) => s.verified >= MIN_VERIFIED_PER_TEAM);

  // Need at least 10 unique teams (5 rounds × 2 players, no re-roll).
  if (eligible.length < 10) {
    return NextResponse.json(
      { error: "not_enough_teams", count: eligible.length },
      { status: 400 }
    );
  }

  const player_names: WheelPlayerNames = { a, b };
  const initialPayload: DraftWheelPlayPayload = {
    player_names,
    rounds: buildInitialRounds(),
    rerolls_available: { a: true, b: true },
    used_team_slugs: [],
  };

  const session = await ensureCurrentSession();
  const { user_id, anon_session_id } = sessionKey(session);

  // Remember player A's name on the session for cross-game continuity.
  if (anon_session_id) {
    void createServiceClient()
      .from("anon_sessions")
      .update({ display_name: a })
      .eq("id", anon_session_id);
  }

  const supa = createServiceClient();
  const token = shareToken();
  const { data: play, error } = await supa
    .from("plays")
    .insert({
      game_slug: "draft-wheel",
      user_id,
      anon_session_id,
      payload: initialPayload,
      result: null,
      share_token: token,
    })
    .select("id, share_token")
    .single();

  if (error || !play) {
    console.error(JSON.stringify({ scope: "draft-wheel.start", err: error?.message }));
    return NextResponse.json({ error: "play_failed" }, { status: 500 });
  }

  return NextResponse.json({
    play_id: play.id,
    share_token: play.share_token,
    player_names,
    available_teams: eligible.map((s) => ({ slug: s.slug, team: s.team })),
  });
}

function sanitizeName(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const t = raw.trim().slice(0, 24);
  return t.length === 0 ? fallback : t;
}
