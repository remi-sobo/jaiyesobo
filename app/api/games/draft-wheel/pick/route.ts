import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPlayersForTeam } from "@/lib/draft-data";
import {
  type DraftWheelPlayPayload,
  type WheelPick,
  type WheelSide,
  TOTAL_ROUNDS,
  eligiblePlayersForSlot,
  pickedIdsAcrossGame,
} from "@/lib/games/draft-wheel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lock a player's pick for the current round.
 *
 *   Body: { play_id, round_index, side, player_id }
 *   Returns: { round_index, side, pick: WheelPick, round }
 *
 * Server validates:
 *   - play exists, game_slug === 'draft-wheel'
 *   - round teams have been spun
 *   - the player_id belongs to that side's team
 *   - the player is at the correct position (primary OR secondary)
 *   - the player hasn't already been picked this game
 *   - this side hasn't already locked a pick this round
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { play_id, round_index, side, player_id } = body as {
    play_id?: unknown;
    round_index?: unknown;
    side?: unknown;
    player_id?: unknown;
  };
  if (
    typeof play_id !== "string" ||
    typeof round_index !== "number" ||
    typeof player_id !== "string" ||
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
  if (!round) {
    return NextResponse.json({ error: "round_not_found" }, { status: 400 });
  }
  const assignment = sideKey === "a" ? round.a : round.b;
  if (!assignment) {
    return NextResponse.json({ error: "spin_required_first" }, { status: 400 });
  }
  const existing = sideKey === "a" ? round.pick_a : round.pick_b;
  if (existing) {
    return NextResponse.json({ error: "pick_already_locked" }, { status: 400 });
  }

  // Pull team's pool, filter to eligible-for-slot, exclude already-picked.
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

  const found = eligible.find((p) => p.id === player_id);
  if (!found) {
    return NextResponse.json({ error: "ineligible_player" }, { status: 400 });
  }

  const pick: WheelPick = {
    player_id: found.id,
    player_name: found.payload.name,
    peak_label: found.payload.team_stint?.peak_label ?? "",
    primary_position: found.payload.primary_position,
  };

  const newRounds = payload.rounds.map((r, i) => {
    if (i !== round_index) return r;
    return sideKey === "a" ? { ...r, pick_a: pick } : { ...r, pick_b: pick };
  });
  const newPayload: DraftWheelPlayPayload = { ...payload, rounds: newRounds };

  const { error: updErr } = await supa
    .from("plays")
    .update({ payload: newPayload })
    .eq("id", play_id);
  if (updErr) {
    console.error(JSON.stringify({ scope: "draft-wheel.pick", err: updErr.message }));
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({
    round_index,
    side,
    pick,
    round: newRounds[round_index],
  });
}
