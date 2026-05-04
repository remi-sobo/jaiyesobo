import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { getActiveKid } from "@/lib/admin-context";

type InTask = {
  date: string;
  title: string;
  description?: string | null;
  type: string;
  subject?: string | null;
  link?: string | null;
  completion_type: "photo" | "reflection" | "check" | "photo_and_reflection";
  reflection_prompt?: string | null;
};

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { tasks } = body as { tasks?: unknown };
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const kid = await getActiveKid();
  const supa = createServiceClient();

  // Find current max sort_order per date to preserve existing ordering
  const rows: Array<Record<string, unknown>> = (tasks as InTask[]).map((t, i) => ({
    user_id: kid.id,
    date: t.date,
    title: t.title,
    description: t.description ?? null,
    type: t.type,
    subject: t.subject ?? null,
    link: t.link ?? null,
    completion_type: t.completion_type,
    reflection_prompt: t.reflection_prompt ?? null,
    requires_photo: t.completion_type === "photo" || t.completion_type === "photo_and_reflection",
    sort_order: (i + 1) * 10,
  }));

  const { data, error } = await supa.from("tasks").insert(rows).select();
  if (error) {
    console.error("Bulk task insert failed:", error);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ inserted: data?.length ?? 0 });
}
