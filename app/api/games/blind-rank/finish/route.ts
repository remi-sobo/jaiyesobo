import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  SLOT_COUNT,
  scoreBlindRank,
  verdictForBlindRankScore,
  type BlindRankPlayPayload,
  type BlindRankResult,
} from "@/lib/games/blind-rank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { play_id?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { play_id } = body;
  if (typeof play_id !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { data: play } = await supa
    .from("plays")
    .select("*")
    .eq("id", play_id)
    .maybeSingle();
  if (!play || play.game_slug !== "blind-rank") {
    return NextResponse.json({ error: "play_not_found" }, { status: 404 });
  }

  // Idempotent: if already scored, return cached result.
  if (play.result && typeof play.result === "object" && "score" in play.result) {
    return NextResponse.json({
      ...(play.result as Record<string, unknown>),
      share_token: play.share_token,
    });
  }

  const payload = play.payload as BlindRankPlayPayload | null;
  if (!payload) {
    return NextResponse.json({ error: "play_corrupted" }, { status: 500 });
  }

  // Every slot 1..5 must be filled.
  const placements = payload.placements ?? {};
  for (let s = 1; s <= SLOT_COUNT; s++) {
    if (!(String(s) in placements)) {
      return NextResponse.json(
        { error: "incomplete", missing_slot: s },
        { status: 400 }
      );
    }
  }

  const { score, slot_results } = scoreBlindRank(payload.items, placements);

  // Build the per-item context for the reveal UI.
  const localOrder = payload.items
    .slice()
    .sort((a, b) => a.canonical_rank - b.canonical_rank);
  const aiSlotByIndex = new Map<number, number>(
    localOrder.map((it, idx) => [it.item_index, idx + 1])
  );
  const playerSlotByIndex = new Map<number, number>();
  for (const [slotStr, itemIdx] of Object.entries(placements)) {
    playerSlotByIndex.set(itemIdx, Number(slotStr));
  }

  const allFacts = payload.items.map((it) => ({
    name: it.name,
    fact: it.fact,
    ai_slot: aiSlotByIndex.get(it.item_index) ?? 0,
    player_slot: playerSlotByIndex.get(it.item_index) ?? 0,
  }));

  const playerRanking = [];
  const aiRanking = [];
  for (let slot = 1; slot <= SLOT_COUNT; slot++) {
    const playerItemIdx = placements[String(slot)];
    const playerItem = payload.items.find((i) => i.item_index === playerItemIdx);
    const aiItem = localOrder[slot - 1];
    playerRanking.push({ slot, name: playerItem?.name ?? "—" });
    aiRanking.push({ slot, name: aiItem.name });
  }

  const result: BlindRankResult = {
    score,
    total_slots: SLOT_COUNT,
    slot_results,
    player_ranking: playerRanking,
    ai_ranking: aiRanking,
    all_facts: allFacts,
    verdict_line: verdictForBlindRankScore(score),
    topic_title: payload.topic_title,
    topic_subtitle: payload.topic_subtitle,
  };

  const newPayload: BlindRankPlayPayload = {
    ...payload,
    completed_at: new Date().toISOString(),
  };

  const { error: updateErr } = await supa
    .from("plays")
    .update({ result, payload: newPayload })
    .eq("id", play_id);
  if (updateErr) {
    console.error(
      JSON.stringify({ scope: "games.blind-rank.finish", err: updateErr.message })
    );
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ...result, share_token: play.share_token });
}
