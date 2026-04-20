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
  const { date, text } = body as Record<string, unknown>;
  if (typeof date !== "string" || typeof text !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supa = createServiceClient();
  if (text.trim().length === 0) {
    // Delete empty notes
    const { error } = await supa.from("dad_notes").delete().eq("date", date);
    if (error) {
      console.error("Dad note delete failed:", error);
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, savedAt: new Date().toISOString(), empty: true });
  }

  const { error } = await supa
    .from("dad_notes")
    .upsert(
      { date, body: text, updated_at: new Date().toISOString() },
      { onConflict: "date" }
    );
  if (error) {
    console.error("Dad note upsert failed:", error);
    return NextResponse.json({ error: "upsert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}
