import { NextResponse } from "next/server";
import { ensureCurrentSession, sessionKey } from "@/lib/games/session";
import { createServiceClient } from "@/lib/supabase/server";
import { shareToken } from "@/lib/games/data";
import { selectTriviaRound } from "@/lib/games/trivia-select";
import { TRIVIA_DIFFICULTIES, type TriviaDifficultyKey } from "@/lib/games/trivia-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_DIFFICULTIES = new Set(Object.keys(TRIVIA_DIFFICULTIES));

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { difficulty } = body as { difficulty?: unknown };
  if (typeof difficulty !== "string" || !ALLOWED_DIFFICULTIES.has(difficulty)) {
    return NextResponse.json({ error: "bad_difficulty" }, { status: 400 });
  }

  const session = await ensureCurrentSession();
  const { user_id, anon_session_id } = sessionKey(session);

  let questions;
  try {
    questions = await selectTriviaRound(difficulty as TriviaDifficultyKey);
  } catch (err) {
    console.error(JSON.stringify({ scope: "trivia.start", err: String(err) }));
    return NextResponse.json({ error: "no_questions" }, { status: 500 });
  }

  if (questions.length < 10) {
    return NextResponse.json(
      { error: "not_enough_questions", count: questions.length },
      { status: 503 }
    );
  }

  const supa = createServiceClient();
  const token = shareToken();
  const { data, error } = await supa
    .from("plays")
    .insert({
      game_slug: "trivia",
      user_id,
      anon_session_id,
      payload: {
        difficulty,
        question_ids: questions.map((q) => q.id),
        // Cache the public-safe view of each question on the play row so we
        // don't have to re-query game_content during /answer (which would
        // double-up DB cost). Correct index + explanation stay server-only.
        questions_public: questions.map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          category: q.category,
          difficulty: q.difficulty,
        })),
      },
      result: null,
      share_token: token,
    })
    .select("id, share_token")
    .single();

  if (error || !data) {
    console.error(JSON.stringify({ scope: "trivia.start", err: error?.message }));
    return NextResponse.json({ error: "play_failed" }, { status: 500 });
  }

  return NextResponse.json({
    play_id: data.id,
    share_token: data.share_token,
    questions: questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      category: q.category,
      difficulty: q.difficulty,
    })),
  });
}
