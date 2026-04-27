import { NextResponse } from "next/server";
import { getKidSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { getJaiye } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getKidSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const taskId = url.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const jaiye = await getJaiye();
  if (!jaiye) return NextResponse.json({ error: "no_user" }, { status: 500 });

  const supa = createServiceClient();
  const { data, error } = await supa
    .from("lesson_drafts")
    .select("field_path, value")
    .eq("task_id", taskId)
    .eq("user_id", jaiye.id);
  if (error) {
    console.error(JSON.stringify({ scope: "drafts.load", err: error.message }));
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  const drafts: Record<string, string> = {};
  for (const row of data ?? []) drafts[row.field_path] = row.value;
  return NextResponse.json({ drafts });
}
