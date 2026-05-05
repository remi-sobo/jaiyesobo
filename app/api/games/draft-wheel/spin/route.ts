import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getDraftTeamSummaries } from "@/lib/draft-data";
import {
  type DraftWheelPlayPayload,
  type WheelTeamAssignment,
  spinWheel,
  TOTAL_ROUNDS,
} from "@/lib/games/draft-wheel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_VERIFIED_PER_TEAM = 12;

/**
 * Spin the wheel for a given round — assigns 2 distinct unused teams to
 * players A and B. Idempotent: if both teams are already assigned for that
 * round, returns the existing assignment without re-spinning.
 *
 *   Body: { play_id, round_index }
 *   Returns: { round_index, a: WheelTeamAssignment, b: WheelTeamAssignment }
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { play_id, round_index } = body as { play_id?: unknown; round_index?: unknown };
  if (typeof play_id !== "string" || typeof round_index !== "number") {
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
  const round = payload.rounds[round_index];
  if (!round) {
    return NextResponse.json({ error: "round_not_found" }, { status: 400 });
  }

  // Idempotent: already spun
  if (round.a && round.b) {
    return NextResponse.json({ round_index, a: round.a, b: round.b });
  }

  // Build available pool from current eligible summaries
  const summaries = await getDraftTeamSummaries();
  const eligibleSlugs = summaries
    .filter((s) => s.verified >= MIN_VERIFIED_PER_TEAM)
    .map((s) => s.slug);
  const summaryMap = new Map(summaries.map((s) => [s.slug, s.team]));

  const used = new Set(payload.used_team_slugs);
  let a: WheelTeamAssignment;
  let b: WheelTeamAssignment;
  try {
    const draw = spinWheel(eligibleSlugs, used);
    const teamA = summaryMap.get(draw.a);
    const teamB = summaryMap.get(draw.b);
    if (!teamA || !teamB) throw new Error("missing_team_payload");
    a = { team_slug: draw.a, team: teamA };
    b = { team_slug: draw.b, team: teamB };
  } catch (err) {
    console.error(
      JSON.stringify({
        scope: "draft-wheel.spin",
        play_id,
        err: err instanceof Error ? err.message : String(err),
      })
    );
    return NextResponse.json({ error: "no_teams_available" }, { status: 409 });
  }

  // Persist
  const newRounds = payload.rounds.map((r, i) =>
    i === round_index ? { ...r, a, b } : r
  );
  const newPayload: DraftWheelPlayPayload = {
    ...payload,
    rounds: newRounds,
    used_team_slugs: [...payload.used_team_slugs, a.team_slug, b.team_slug],
  };

  const { error: updErr } = await supa
    .from("plays")
    .update({ payload: newPayload })
    .eq("id", play_id);
  if (updErr) {
    console.error(JSON.stringify({ scope: "draft-wheel.spin.update", err: updErr.message }));
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ round_index, a, b });
}
