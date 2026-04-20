import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { weekStartDate, bodyMarkdown } = body as Record<string, unknown>;
  if (typeof weekStartDate !== "string" || typeof bodyMarkdown !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { error } = await supa
    .from("weekly_briefs")
    .upsert(
      {
        week_start_date: weekStartDate,
        body_markdown: bodyMarkdown,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "week_start_date" }
    );
  if (error) {
    console.error("Weekly brief upsert failed:", error);
    return NextResponse.json({ error: "upsert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}
