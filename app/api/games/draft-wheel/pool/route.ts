import { NextResponse } from "next/server";
import { getPlayersForTeam } from "@/lib/draft-data";
import {
  type DraftWheelPlayPayload,
  type WheelSide,
  TOTAL_ROUNDS,
  eligiblePlayersForSlot,
  pickedIdsAcrossGame,
} from "@/lib/games/draft-wheel";
import { createServiceClient } from "@/lib/supabase/server";
import { toPoolPlayer, type DraftPoolPlayer } from "@/lib/draft-game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fetch the eligible player pool for a side at the current round. Returns the
 * filtered pool the client uses for the autocomplete picker — only players
 * from THAT team at THAT position who haven't been picked yet this game.
 *
 *   Body: { play_id, round_index, side }
 *   Returns: { pool: DraftPoolPlayer[], position, team_slug }
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { play_id, round_index, side } = body as {
    play_id?: unknown;
    round_index?: unknown;
    side?: unknown;
  };
  if (
    typeof play_id !== "string" ||
    typeof round_index !== "number" ||
    (side !== "a" && side !== "b")
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (round_index < 0 || round_index >= TOTAL_ROUNDS) {
    return NextResponse.json({ error: "round_out_of_range" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { data: play } = await supa
    .from("plays")
    .select("id, payload, game_slug")
    .eq("id", play_id)
    .maybeSingle();
  if (!play || play.game_slug !== "draft-wheel") {
    return NextResponse.json({ error: "play_not_found" }, { status: 404 });
  }
  const payload = play.payload as DraftWheelPlayPayload;
  const sideKey = side as WheelSide;
  const round = payload.rounds[round_index];
  const assignment = sideKey === "a" ? round?.a : round?.b;
  if (!round || !assignment) {
    return NextResponse.json({ error: "spin_required_first" }, { status: 400 });
  }

  const teamPool = await getPlayersForTeam(assignment.team_slug);
  const verified = teamPool.filter(
    (r) => r.verification_status === "verified" && r.status === "live"
  );
  const pickedIds = pickedIdsAcrossGame(payload.rounds);
  const eligible = eligiblePlayersForSlot(
    verified.map((r) => ({ id: r.id, payload: r.payload })),
    round.position,
    pickedIds
  );
  const pool: DraftPoolPlayer[] = eligible.map((row) => toPoolPlayer(row.id, row.payload));

  return NextResponse.json({
    pool,
    position: round.position,
    team_slug: assignment.team_slug,
  });
}
