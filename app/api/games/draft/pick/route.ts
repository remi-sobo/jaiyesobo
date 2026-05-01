import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  type DraftPick,
  type DraftPlayPayload,
  type DraftPoolPlayer,
  nextTurn,
  roundFor,
  toPoolPlayer,
  TOTAL_PICKS,
} from "@/lib/draft-game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Commit a human pick.
 *
 * Server is the source of truth: validates that
 *  - play exists
 *  - it's the human's turn
 *  - the chosen player is in the team's pool
 *  - the player hasn't already been drafted
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { play_id, player_id } = body as { play_id?: unknown; player_id?: unknown };
  if (typeof play_id !== "string" || typeof player_id !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { data: play } = await supa.from("plays").select("*").eq("id", play_id).maybeSingle();
  if (!play || play.game_slug !== "draft") {
    return NextResponse.json({ error: "play_not_found" }, { status: 404 });
  }

  const payload = play.payload as DraftPlayPayload;
  if (!payload || !Array.isArray(payload.picks)) {
    return NextResponse.json({ error: "play_corrupt" }, { status: 500 });
  }
  if (payload.picks.length >= TOTAL_PICKS) {
    return NextResponse.json({ error: "draft_complete" }, { status: 400 });
  }

  const turn = nextTurn(payload.picks, payload.starts);
  if (turn !== "human") {
    return NextResponse.json({ error: "not_your_turn" }, { status: 400 });
  }

  // Already drafted?
  const taken = new Set(payload.picks.map((p) => p.player_id));
  if (taken.has(player_id)) {
    return NextResponse.json({ error: "already_drafted" }, { status: 400 });
  }

  // Verify player exists in this team's verified pool
  const { data: row } = await supa
    .from("game_content")
    .select("id, payload, draft_team_slug, verification_status, content_type, status")
    .eq("id", player_id)
    .maybeSingle();
  if (
    !row ||
    (row as { content_type: string }).content_type !== "draft_player" ||
    (row as { draft_team_slug: string }).draft_team_slug !== payload.team_slug ||
    (row as { verification_status: string }).verification_status !== "verified" ||
    (row as { status: string }).status !== "live"
  ) {
    return NextResponse.json({ error: "player_not_in_pool" }, { status: 400 });
  }

  const pool: DraftPoolPlayer = toPoolPlayer(
    (row as { id: string }).id,
    (row as { payload: import("@/lib/draft-data").DraftPlayerPayload }).payload
  );

  const pickIndex = payload.picks.length;
  const pick: DraftPick = {
    side: "human",
    player_id: pool.id,
    player_name: pool.name,
    primary_position: pool.primary_position,
    round: roundFor(pickIndex),
    pick_number: pickIndex + 1,
  };

  const updated: DraftPlayPayload = {
    ...payload,
    picks: [...payload.picks, pick],
  };

  const { error: updErr } = await supa.from("plays").update({ payload: updated }).eq("id", play_id);
  if (updErr) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ pick, picks: updated.picks });
}
