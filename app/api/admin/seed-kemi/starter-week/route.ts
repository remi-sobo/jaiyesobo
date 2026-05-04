import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { isoDate } from "@/lib/week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TaskSeed = {
  title: string;
  description: string | null;
  type: "homeschool" | "habit" | "chore" | "ball" | "family" | "other";
  subject: string | null;
  completion_type: "photo" | "reflection" | "check" | "photo_and_reflection";
  reflection_prompt: string | null;
  requires_photo: boolean;
  scheduled_time: string | null;
  estimated_minutes: number;
  sort_order: number;
};

// Four balanced tasks, sized for a 6-year-old. Math is dropped into Power Hour
// (09:00) so it shows up inside the morning anchor block.
const DAILY_SEEDS: TaskSeed[] = [
  {
    title: "Math practice",
    description: "Workbook pages or tabletop math game with Mommy.",
    type: "homeschool",
    subject: "Math",
    completion_type: "check",
    reflection_prompt: null,
    requires_photo: false,
    scheduled_time: "09:00",
    estimated_minutes: 20,
    sort_order: 10,
  },
  {
    title: "Read with Mommy",
    description: "Pick a book and read together.",
    type: "homeschool",
    subject: "Reading",
    completion_type: "check",
    reflection_prompt: null,
    requires_photo: false,
    scheduled_time: null,
    estimated_minutes: 15,
    sort_order: 20,
  },
  {
    title: "Handwriting practice",
    description: "One page of handwriting. Take a picture when it's done.",
    type: "homeschool",
    subject: "Writing",
    completion_type: "photo_and_reflection",
    reflection_prompt: "What letter or word did you like writing the most?",
    requires_photo: true,
    scheduled_time: null,
    estimated_minutes: 15,
    sort_order: 30,
  },
  {
    title: "Morning habits",
    description: "Make your bed. Brush your teeth. Get dressed.",
    type: "habit",
    subject: null,
    completion_type: "check",
    reflection_prompt: null,
    requires_photo: false,
    scheduled_time: null,
    estimated_minutes: 10,
    sort_order: 40,
  },
];

const WELCOME_NOTE_BODY =
  "Welcome to your /me, Kemi 🌸 You can plan your day here. We're so proud of you.";

/**
 * POST /api/admin/seed-kemi/starter-week
 *
 * Idempotent: builds the next two work weeks (10 weekdays) of starter tasks
 * for Kemi. Wipes any existing tasks she has in that date range first, then
 * inserts. Also sets the welcome "Note from Mommy & Daddy" on the first Monday.
 *
 * Requires `/api/admin/seed-kemi` to have run first.
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

  const weekdays = nextTwoWorkWeeks();
  const startIso = isoDate(weekdays[0]);
  const endIso = isoDate(weekdays[weekdays.length - 1]);

  // Wipe Kemi's tasks in this range to make re-runs idempotent.
  const { error: delErr } = await supa
    .from("tasks")
    .delete()
    .eq("user_id", kemi.id)
    .gte("date", startIso)
    .lte("date", endIso);
  if (delErr) {
    console.error("starter-week wipe failed:", delErr);
    return NextResponse.json({ error: "wipe_failed" }, { status: 500 });
  }

  const rows = weekdays.flatMap((d) => {
    const date = isoDate(d);
    return DAILY_SEEDS.map((s) => ({
      user_id: kemi.id,
      date,
      title: s.title,
      description: s.description,
      type: s.type,
      subject: s.subject,
      link: null,
      completion_type: s.completion_type,
      reflection_prompt: s.reflection_prompt,
      requires_photo: s.requires_photo,
      scheduled_time: s.scheduled_time,
      estimated_minutes: s.estimated_minutes,
      sort_order: s.sort_order,
    }));
  });

  const { error: insErr } = await supa.from("tasks").insert(rows);
  if (insErr) {
    console.error("starter-week insert failed:", insErr);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  // Welcome note on the first Monday.
  const firstMonday = isoDate(weekdays[0]);
  const { error: noteErr } = await supa
    .from("dad_notes")
    .upsert(
      {
        user_id: kemi.id,
        date: firstMonday,
        body: WELCOME_NOTE_BODY,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "date,user_id" }
    );
  if (noteErr) {
    console.error("starter-week note upsert failed:", noteErr);
    return NextResponse.json({ error: "note_upsert_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    range: { start: startIso, end: endIso },
    tasks_inserted: rows.length,
    welcome_note_date: firstMonday,
  });
}

/**
 * Returns the next two work weeks (Mon–Fri × 2 = 10 dates).
 * Starts from the upcoming Monday, or today if today IS Monday-Friday with
 * a head-start: actually we always start from the upcoming Monday for clean
 * week boundaries.
 */
function nextTwoWorkWeeks(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  // Days to add to reach next Monday. If today is Monday, start today.
  const toMonday = dow === 1 ? 0 : (8 - dow) % 7 || 7;
  const start = new Date(today);
  start.setDate(start.getDate() + toMonday);

  const out: Date[] = [];
  for (let week = 0; week < 2; week++) {
    for (let day = 0; day < 5; day++) {
      const d = new Date(start);
      d.setDate(d.getDate() + week * 7 + day);
      out.push(d);
    }
  }
  return out;
}
