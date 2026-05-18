import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getCutSetById } from "@/lib/games/the-cut-data";
import {
  REQUIRED_KEEPS,
  verdictForScore,
  type CutPlayPayload,
  type CutPlayResult,
} from "@/lib/games/the-cut";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  play_id?: string;
  kept_names?: string[];
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { play_id, kept_names } = body;
  if (typeof play_id !== "string" || !Array.isArray(kept_names)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { data: play } = await supa.from("plays").select("*").eq("id", play_id).maybeSingle();
  if (!play || play.game_slug !== "the-cut") {
    return NextResponse.json({ error: "play_not_found" }, { status: 404 });
  }

  // Already locked → return cached verdict (idempotent).
  if (play.result && typeof play.result === "object" && "score" in play.result) {
    return NextResponse.json({
      ...(play.result as Record<string, unknown>),
      share_token: play.share_token,
    });
  }

  const payload = play.payload as CutPlayPayload | null;
  if (!payload || !payload.set_id) {
    return NextResponse.json({ error: "play_corrupted" }, { status: 500 });
  }

  // Dedupe + trim incoming names. Must be exactly REQUIRED_KEEPS and every
  // name must come from the play's set.
  const cleanedKept = Array.from(
    new Set(kept_names.map((n) => String(n).trim()).filter((n) => n.length > 0))
  );
  if (cleanedKept.length !== REQUIRED_KEEPS) {
    return NextResponse.json(
      { error: "wrong_keep_count", message: `Must keep exactly ${REQUIRED_KEEPS}` },
      { status: 400 }
    );
  }
  const playSetNames = new Set(payload.shuffled_names);
  for (const n of cleanedKept) {
    if (!playSetNames.has(n)) {
      return NextResponse.json({ error: "name_not_in_set" }, { status: 400 });
    }
  }

  // Load the set's true is_keep flags. Source of truth = game_content.
  const set = await getCutSetById(payload.set_id);
  if (!set) {
    return NextResponse.json({ error: "set_not_found" }, { status: 500 });
  }
  const isKeepByName = new Map(set.payload.items.map((i) => [i.name, i.is_keep]));

  const correctKeeps: string[] = [];
  const wrongKeeps: string[] = [];
  for (const name of cleanedKept) {
    if (isKeepByName.get(name)) correctKeeps.push(name);
    else wrongKeeps.push(name);
  }
  const missedKeeps = set.payload.items
    .filter((i) => i.is_keep && !cleanedKept.includes(i.name))
    .map((i) => i.name);

  const score = correctKeeps.length;
  const result: CutPlayResult = {
    score,
    total_keeps: REQUIRED_KEEPS,
    correct_keeps: correctKeeps,
    wrong_keeps: wrongKeeps,
    missed_keeps: missedKeeps,
    all_items_with_facts: set.payload.items,
    criterion_summary: set.payload.criterion_summary,
    set_title: set.payload.title,
    mode: payload.mode,
    verdict_line: verdictForScore(score),
  };

  const newPayload: CutPlayPayload = {
    ...payload,
    kept_names: cleanedKept,
    completed_at: new Date().toISOString(),
  };

  const { error: updateErr } = await supa
    .from("plays")
    .update({ result, payload: newPayload })
    .eq("id", play_id);
  if (updateErr) {
    console.error(JSON.stringify({ scope: "games.the-cut.lock", err: updateErr.message }));
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ...result, share_token: play.share_token });
}
