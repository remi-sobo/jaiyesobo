import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnchorSeed = {
  title: string;
  subtitle: string | null;
  emoji: string;
  start_time: string;
  end_time: string;
  recurring_pattern: string;
};

// Spec: Power Hour at 09:00 (slower morning ramp for a 6-year-old) + Lunch.
// Other anchors (Art class, etc.) you'll add per-week from the admin UI.
const KEMI_ANCHORS: AnchorSeed[] = [
  {
    title: "Power Hour",
    subtitle: "Learning time",
    emoji: "⚡",
    start_time: "09:00",
    end_time: "10:00",
    recurring_pattern: "weekdays",
  },
  {
    title: "Lunch",
    subtitle: null,
    emoji: "🍽️",
    start_time: "12:00",
    end_time: "13:00",
    recurring_pattern: "weekdays",
  },
];

/**
 * POST /api/admin/seed-kemi/anchors
 *
 * Idempotent: inserts Kemi's default recurring anchors (Power Hour + Lunch).
 * Skips any anchor whose title already exists for her.
 *
 * Requires `/api/admin/seed-kemi` to have run first (Kemi user must exist).
 */
export async function POST() {
  await requireAdmin();
  const supa = createServiceClient();

  const { data: kemi, error: lookupErr } = await supa
    .from("users")
    .select("id")
    .eq("role", "kid")
    .eq("display_name", "Kemi")
    .maybeSingle();
  if (lookupErr) {
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
  if (!kemi) {
    return NextResponse.json(
      { error: "kemi_not_found", hint: "POST /api/admin/seed-kemi first" },
      { status: 412 }
    );
  }

  const { data: existing } = await supa
    .from("time_anchors")
    .select("title")
    .eq("user_id", kemi.id);
  const existingTitles = new Set((existing ?? []).map((a) => a.title));

  const added: string[] = [];
  const skipped: string[] = [];
  for (const a of KEMI_ANCHORS) {
    if (existingTitles.has(a.title)) {
      skipped.push(a.title);
      continue;
    }
    const { error } = await supa.from("time_anchors").insert({
      user_id: kemi.id,
      title: a.title,
      subtitle: a.subtitle,
      emoji: a.emoji,
      start_time: a.start_time,
      end_time: a.end_time,
      recurring_pattern: a.recurring_pattern,
      date: null,
    });
    if (error) {
      console.error(`seed-kemi-anchors ${a.title}:`, error.message);
      return NextResponse.json({ error: "insert_failed", anchor: a.title }, { status: 500 });
    }
    added.push(a.title);
  }

  return NextResponse.json({ ok: true, added, skipped });
}
