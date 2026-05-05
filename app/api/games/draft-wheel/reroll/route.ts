import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getDraftTeamSummaries } from "@/lib/draft-data";
import {
  type DraftWheelPlayPayload,
  type WheelSide,
  type WheelTeamAssignment,
  pickReplacementTeam,
  TOTAL_ROUNDS,
} from "@/lib/games/draft-wheel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_VERIFIED_PER_TEAM = 12;

/**
 * Use the player's one re-roll token. Replaces THAT player's team for the
 * current round with a fresh random team. The original team stays in
 * used_team_slugs (counts as "spent"). Token can only be used before the
 * player has locked their pick for the round.
 *
 *   Body: { play_id, round_index, side: "a" | "b" }
 *   Returns: { round_index, side, assignment: WheelTeamAssignment, rerolls_available }
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

  if (!payload.rerolls_available[sideKey]) {
    return NextResponse.json({ error: "no_reroll_available" }, { status: 400 });
  }

  const round = payload.rounds[round_index];
  if (!round) {
    return NextResponse.json({ error: "round_not_found" }, { status: 400 });
  }
  if (!round.a || !round.b) {
    return NextResponse.json({ error: "spin_required_first" }, { status: 400 });
  }

  // Once you've locked your pick, no re-rolls.
  const lockedPick = sideKey === "a" ? round.pick_a : round.pick_b;
  if (lockedPick) {
    return NextResponse.json({ error: "pick_already_locked" }, { status: 400 });
  }

  // Pull a new team
  const summaries = await getDraftTeamSummaries();
  const eligibleSlugs = summaries
    .filter((s) => s.verified >= MIN_VERIFIED_PER_TEAM)
    .map((s) => s.slug);
  const summaryMap = new Map(summaries.map((s) => [s.slug, s.team]));

  const used = new Set(payload.used_team_slugs);
  let newSlug: string;
  try {
    newSlug = pickReplacementTeam(eligibleSlugs, used);
  } catch {
    return NextResponse.json({ error: "no_teams_available" }, { status: 409 });
  }
  const teamPayload = summaryMap.get(newSlug);
  if (!teamPayload) {
    return NextResponse.json({ error: "missing_team_payload" }, { status: 500 });
  }

  const newAssignment: WheelTeamAssignment = {
    team_slug: newSlug,
    team: teamPayload,
    rerolled: true,
  };

  const newRounds = payload.rounds.map((r, i) => {
    if (i !== round_index) return r;
    return sideKey === "a" ? { ...r, a: newAssignment } : { ...r, b: newAssignment };
  });

  const newPayload: DraftWheelPlayPayload = {
    ...payload,
    rounds: newRounds,
    used_team_slugs: [...payload.used_team_slugs, newSlug],
    rerolls_available: { ...payload.rerolls_available, [sideKey]: false },
  };

  const { error: updErr } = await supa
    .from("plays")
    .update({ payload: newPayload })
    .eq("id", play_id);
  if (updErr) {
    console.error(JSON.stringify({ scope: "draft-wheel.reroll", err: updErr.message }));
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({
    round_index,
    side,
    assignment: newAssignment,
    rerolls_available: newPayload.rerolls_available,
  });
}
