import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { getActiveKid } from "@/lib/admin-context";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const {
    date,
    title,
    description,
    type,
    subject,
    link,
    completion_type,
    reflection_prompt,
  } = body as Record<string, string | null | undefined>;

  if (!date || !title || !type || !completion_type) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const kid = await getActiveKid();
  const supa = createServiceClient();

  // Compute next sort_order for this day
  const { data: existing } = await supa
    .from("tasks")
    .select("sort_order")
    .eq("user_id", kid.id)
    .eq("date", date)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSort = ((existing?.[0]?.sort_order as number | undefined) ?? 0) + 10;

  const { data, error } = await supa
    .from("tasks")
    .insert({
      user_id: kid.id,
      date,
      title,
      description: description ?? null,
      type,
      subject: subject ?? null,
      link: link ?? null,
      completion_type,
      reflection_prompt: reflection_prompt ?? null,
      requires_photo: completion_type === "photo" || completion_type === "photo_and_reflection",
      sort_order: nextSort,
    })
    .select()
    .single();

  if (error) {
    console.error("Task create failed:", error);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ task: data });
}
