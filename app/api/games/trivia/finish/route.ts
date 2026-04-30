import { NextResponse } from "next/server";
import { ensureCurrentSession, sessionKey } from "@/lib/games/session";
import { createServiceClient } from "@/lib/supabase/server";
import { getQuestionsByIds } from "@/lib/games/trivia-select";
import { getRoastLine } from "@/lib/games/trivia-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnswerInput = {
  question_id: string;
  selected_index: number;
  time_ms: number;
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { play_id, answers } = body as { play_id?: unknown; answers?: unknown };
  if (typeof play_id !== "string" || !Array.isArray(answers)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const session = await ensureCurrentSession();
  const ident = identifierFor(session);
  if (!ident) return NextResponse.json({ error: "no_session" }, { status: 500 });

  const supa = createServiceClient();
  const { data: play } = await supa.from("plays").select("*").eq("id", play_id).maybeSingle();
  if (!play || play.game_slug !== "trivia") {
    return NextResponse.json({ error: "play_not_found" }, { status: 404 });
  }

  // Idempotent: if we've already finished, return the cached result
  if (play.result && typeof play.result === "object" && "score" in play.result) {
    return NextResponse.json({ ...(play.result as Record<string, unknown>), share_token: play.share_token });
  }

  const payload = play.payload as { difficulty?: string; question_ids?: string[] } | null;
  const ids = payload?.question_ids ?? [];
  const questions = await getQuestionsByIds(ids);
  const byId = new Map(questions.map((q) => [q.id, q]));

  const ansArr = answers as AnswerInput[];
  const breakdown = ansArr.map((a) => {
    const q = byId.get(a.question_id);
    if (!q) {
      return {
        question_id: a.question_id,
        question: "",
        options: [] as string[],
        correct_index: -1,
        selected_index: a.selected_index,
        correct: false,
        explanation: "",
        category: "other",
        difficulty: "medium" as const,
        time_ms: a.time_ms,
      };
    }
    return {
      question_id: q.id,
      question: q.question,
      options: q.options,
      correct_index: q.correct_index,
      selected_index: a.selected_index,
      correct: a.selected_index === q.correct_index,
      explanation: q.explanation,
      category: q.category,
      difficulty: q.difficulty,
      time_ms: a.time_ms,
    };
  });

  const score = breakdown.filter((b) => b.correct).length;
  const roast = getRoastLine(score);

  // Update streak row
  const today = new Date().toISOString().slice(0, 10);
  const { data: streakRow } = await supa
    .from("trivia_streaks")
    .select("*")
    .eq("identifier", ident)
    .maybeSingle();

  const prev = streakRow ?? {
    identifier: ident,
    current_streak: 0,
    best_streak: 0,
    last_round_date: null,
    last_round_score: null,
    total_rounds: 0,
    total_correct: 0,
  };

  const newCurrent = score >= 8 ? prev.current_streak + 1 : 0;
  const newBest = Math.max(prev.best_streak, newCurrent);

  await supa.from("trivia_streaks").upsert(
    {
      identifier: ident,
      current_streak: newCurrent,
      best_streak: newBest,
      last_round_date: today,
      last_round_score: score,
      total_rounds: prev.total_rounds + 1,
      total_correct: prev.total_correct + score,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "identifier" }
  );

  const result = {
    score,
    total: 10,
    difficulty: payload?.difficulty ?? "medium",
    roast,
    streak: { current: newCurrent, best: newBest },
    breakdown,
  };

  await supa.from("plays").update({ result }).eq("id", play_id);

  return NextResponse.json({ ...result, share_token: play.share_token });
}

function identifierFor(session: ReturnType<typeof sessionKey> | Awaited<ReturnType<typeof ensureCurrentSession>>): string | null {
  if (!session) return null;
  if ("kind" in session) {
    if (session.kind === "auth") return `auth:${session.user.id}`;
    return `anon:${session.session.id}`;
  }
  if (session.user_id) return `auth:${session.user_id}`;
  if (session.anon_session_id) return `anon:${session.anon_session_id}`;
  return null;
}
