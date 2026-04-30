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
  const { task_id } = body as { task_id?: unknown };
  if (typeof task_id !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const jaiye = await getJaiye();
  if (!jaiye) return NextResponse.json({ error: "no_user" }, { status: 500 });

  const supa = createServiceClient();
  const { data: task } = await supa
    .from("tasks")
    .select("id, user_id")
    .eq("id", task_id)
    .maybeSingle();
  if (!task) return NextResponse.json({ error: "task_not_found" }, { status: 404 });
  if (task.user_id !== jaiye.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { error } = await supa.from("tasks").update({ scheduled_time: null }).eq("id", task_id);
  if (error) {
    console.error(JSON.stringify({ scope: "tasks.unschedule", err: error.message }));
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
