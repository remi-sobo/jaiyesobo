import { NextResponse } from "next/server";
import { getKidSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

const GRACE_MS = 10 * 60 * 1000;

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
  const { data, error } = await supa
    .from("completions")
    .select("id, completed_at")
    .eq("task_id", taskId)
    .is("deleted_at", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Undo fetch failed:", error);
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_done" }, { status: 400 });
  }

  const age = Date.now() - new Date(data.completed_at).getTime();
  if (age > GRACE_MS) {
    return NextResponse.json(
      {
        error: "grace_expired",
        message: "Ask Dad to undo this one — it's been a while.",
      },
      { status: 400 }
    );
  }

  const { error: updErr } = await supa
    .from("completions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", data.id);
  if (updErr) {
    console.error("Undo update failed:", updErr);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
