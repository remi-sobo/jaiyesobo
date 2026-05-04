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
  const { date, text } = body as Record<string, unknown>;
  if (typeof date !== "string" || typeof text !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const kid = await getActiveKid();
  const supa = createServiceClient();
  if (text.trim().length === 0) {
    // Delete empty notes — must scope by user_id (migration 016 made
    // dad_notes uniqueness composite on (date, user_id)).
    const { error } = await supa
      .from("dad_notes")
      .delete()
      .eq("user_id", kid.id)
      .eq("date", date);
    if (error) {
      console.error("Dad note delete failed:", error);
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, savedAt: new Date().toISOString(), empty: true });
  }

  const { error } = await supa
    .from("dad_notes")
    .upsert(
      { user_id: kid.id, date, body: text, updated_at: new Date().toISOString() },
      { onConflict: "date,user_id" }
    );
  if (error) {
    console.error("Dad note upsert failed:", error);
    return NextResponse.json({ error: "upsert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}
