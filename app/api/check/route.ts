import { NextResponse } from "next/server";
import { getKidSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const session = await getKidSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { taskId } = body as { taskId?: unknown };
  if (typeof taskId !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { data: task, error: tErr } = await supa
    .from("tasks")
    .select("id, completion_type")
    .eq("id", taskId)
    .maybeSingle();
  if (tErr || !task) return NextResponse.json({ error: "task_not_found" }, { status: 404 });
  if (task.completion_type !== "check") {
    return NextResponse.json({ error: "wrong_completion_type" }, { status: 400 });
  }

  const { error: cErr } = await supa.from("completions").insert({ task_id: taskId });
  if (cErr) {
    console.error("Check completion insert failed:", cErr);
    return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
