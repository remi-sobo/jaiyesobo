import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { ensureJaiye } from "@/lib/admin-data";
import { isoDate, addDays } from "@/lib/week";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { weekStartDate } = body as Record<string, unknown>;
  if (typeof weekStartDate !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const jaiye = await ensureJaiye();
  const supa = createServiceClient();

  const currentStart = new Date(`${weekStartDate}T00:00:00`);
  const prevStart = addDays(currentStart, -7);
  const prevEnd = addDays(prevStart, 6);
  const currentEnd = addDays(currentStart, 6);

  // Wipe this week for Jaiye first (avoid duplicate stacking)
  const { error: delErr } = await supa
    .from("tasks")
    .delete()
    .eq("user_id", jaiye.id)
    .gte("date", isoDate(currentStart))
    .lte("date", isoDate(currentEnd));
  if (delErr) {
    console.error("Pre-dup delete failed:", delErr);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  // Read previous week
  const { data: prev, error: readErr } = await supa
    .from("tasks")
    .select("date, title, description, type, subject, link, completion_type, reflection_prompt, requires_photo, sort_order")
    .eq("user_id", jaiye.id)
    .gte("date", isoDate(prevStart))
    .lte("date", isoDate(prevEnd));
  if (readErr) {
    console.error("Prev read failed:", readErr);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }

  if (!prev || prev.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  const dayShift = 7;
  const rows = prev.map((row) => {
    const d = new Date(`${row.date}T00:00:00`);
    d.setDate(d.getDate() + dayShift);
    return { ...row, user_id: jaiye.id, date: isoDate(d) };
  });

  const { error: insErr } = await supa.from("tasks").insert(rows);
  if (insErr) {
    console.error("Dup insert failed:", insErr);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}
