import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getQuestionsByIds } from "@/lib/games/trivia-select";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { play_id, question_id, selected_index } = body as {
    play_id?: unknown;
    question_id?: unknown;
    selected_index?: unknown;
  };
  if (typeof play_id !== "string" || typeof question_id !== "string" || typeof selected_index !== "number") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { data: play } = await supa.from("plays").select("payload").eq("id", play_id).maybeSingle();
  if (!play) return NextResponse.json({ error: "play_not_found" }, { status: 404 });

  const payload = play.payload as { question_ids?: string[] } | null;
  const ids = payload?.question_ids ?? [];
  if (!ids.includes(question_id)) {
    return NextResponse.json({ error: "question_not_in_round" }, { status: 400 });
  }

  const [q] = await getQuestionsByIds([question_id]);
  if (!q) return NextResponse.json({ error: "question_missing" }, { status: 404 });

  const correct = selected_index === q.correct_index;
  return NextResponse.json({
    correct,
    correct_index: q.correct_index,
    explanation: q.explanation,
  });
}
