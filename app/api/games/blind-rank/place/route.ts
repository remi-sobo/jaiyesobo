import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { SLOT_COUNT, type BlindRankPlayPayload } from "@/lib/games/blind-rank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  play_id?: string;
  item_index?: number;
  slot?: number;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { play_id, item_index, slot } = body;
  if (
    typeof play_id !== "string" ||
    typeof item_index !== "number" ||
    typeof slot !== "number"
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (slot < 1 || slot > SLOT_COUNT || !Number.isInteger(slot)) {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
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
  if (play.result) {
    return NextResponse.json({ error: "play_already_finished" }, { status: 400 });
  }

  const payload = play.payload as BlindRankPlayPayload | null;
  if (!payload) {
    return NextResponse.json({ error: "play_corrupted" }, { status: 500 });
  }

  // Validate item_index is in range and not already placed.
  const item = payload.items.find((i) => i.item_index === item_index);
  if (!item) {
    return NextResponse.json({ error: "invalid_item" }, { status: 400 });
  }
  const alreadyPlacedAt = Object.entries(payload.placements ?? {}).find(
    ([, idx]) => idx === item_index
  );
  if (alreadyPlacedAt) {
    return NextResponse.json(
      {
        error: "item_already_placed",
        slot: Number(alreadyPlacedAt[0]),
      },
      { status: 400 }
    );
  }
  // No take-backs: slot must be empty.
  const slotKey = String(slot);
  if (payload.placements && slotKey in payload.placements) {
    return NextResponse.json({ error: "slot_filled" }, { status: 400 });
  }

  const newPlacements = { ...(payload.placements ?? {}), [slotKey]: item_index };
  const newPayload: BlindRankPlayPayload = {
    ...payload,
    placements: newPlacements,
  };

  const { error: updateErr } = await supa
    .from("plays")
    .update({ payload: newPayload })
    .eq("id", play_id);
  if (updateErr) {
    console.error(
      JSON.stringify({ scope: "games.blind-rank.place", err: updateErr.message })
    );
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  const placedCount = Object.keys(newPlacements).length;
  const slotsRemaining = [];
  for (let s = 1; s <= SLOT_COUNT; s++) {
    if (!(String(s) in newPlacements)) slotsRemaining.push(s);
  }
  return NextResponse.json({
    success: true,
    placed_count: placedCount,
    items_remaining: payload.items.length - placedCount,
    slots_remaining: slotsRemaining,
  });
}
