import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Context) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const allowed = [
    "title",
    "description",
    "type",
    "subject",
    "link",
    "completion_type",
    "reflection_prompt",
    "date",
    "requires_photo",
    "sort_order",
    "estimated_minutes",
    "scheduled_time",
    "scheduled_end_time",
  ] as const;
  const update: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) update[k] = body[k];
  }
  if ("completion_type" in update && !("requires_photo" in update)) {
    update.requires_photo =
      update.completion_type === "photo" || update.completion_type === "photo_and_reflection";
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { data, error } = await supa.from("tasks").update(update).eq("id", id).select().single();
  if (error) {
    console.error("Task update failed:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ task: data });
}

export async function DELETE(_req: Request, { params }: Context) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const supa = createServiceClient();
  const { error } = await supa.from("tasks").delete().eq("id", id);
  if (error) {
    console.error("Task delete failed:", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
