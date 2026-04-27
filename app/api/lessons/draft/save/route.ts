import { NextResponse } from "next/server";
import { getKidSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { getJaiye } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getKidSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { taskId, fieldPath, value } = body as Record<string, unknown>;
  if (typeof taskId !== "string" || typeof fieldPath !== "string" || typeof value !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (fieldPath.length > 200 || value.length > 50000) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const jaiye = await getJaiye();
  if (!jaiye) return NextResponse.json({ error: "no_user" }, { status: 500 });

  const supa = createServiceClient();
  // Verify the task belongs to Jaiye and isn't completed
  const { data: task } = await supa
    .from("tasks")
    .select("id, user_id, completions(id, deleted_at)")
    .eq("id", taskId)
    .maybeSingle();
  if (!task || task.user_id !== jaiye.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const active = (task.completions as { id: string; deleted_at: string | null }[] | null)?.some(
    (c) => !c.deleted_at
  );
  if (active) {
    return NextResponse.json({ error: "already_completed" }, { status: 409 });
  }

  const { error } = await supa.from("lesson_drafts").upsert(
    {
      task_id: taskId,
      user_id: jaiye.id,
      field_path: fieldPath,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "task_id,field_path" }
  );
  if (error) {
    console.error(JSON.stringify({ scope: "drafts.save", err: error.message }));
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
