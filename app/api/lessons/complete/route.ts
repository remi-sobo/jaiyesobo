import { NextResponse } from "next/server";
import { getKidSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { getJaiye } from "@/lib/data";

export async function POST(req: Request) {
  const session = await getKidSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { taskId, lessonSlug, responses } = body as {
    taskId?: unknown;
    lessonSlug?: unknown;
    responses?: unknown;
  };
  if (typeof taskId !== "string" || typeof lessonSlug !== "string" || !responses || typeof responses !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const jaiye = await getJaiye();
  if (!jaiye) return NextResponse.json({ error: "no_user" }, { status: 500 });

  const supa = createServiceClient();
  const { data: task, error: tErr } = await supa
    .from("tasks")
    .select("id, user_id, completion_type, lesson_slug, completions(id, deleted_at)")
    .eq("id", taskId)
    .maybeSingle();
  if (tErr || !task) return NextResponse.json({ error: "task_not_found" }, { status: 404 });
  if (task.user_id !== jaiye.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (task.completion_type !== "lesson" || task.lesson_slug !== lessonSlug) {
    return NextResponse.json({ error: "lesson_mismatch" }, { status: 400 });
  }
  const completions = (task.completions as { id: string; deleted_at: string | null }[] | null) ?? [];
  if (completions.some((c) => !c.deleted_at)) {
    return NextResponse.json({ error: "already_completed" }, { status: 409 });
  }

  const { error: cErr } = await supa.from("completions").insert({
    task_id: taskId,
    lesson_responses: responses,
  });
  if (cErr) {
    console.error(JSON.stringify({ scope: "lessons.complete", msg: "insert_failed", err: cErr.message }));
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, redirect: "/me" });
}
