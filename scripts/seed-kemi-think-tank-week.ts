/**
 * Seed Kemi's next week (Mon–Fri) with one Think Tank task per day, scheduled
 * inside her 9–10am Power Hour. Each task points at a specific puzzle via
 * tasks.metadata.puzzle_id.
 *
 * Run AFTER seed-think-tank-week1.ts:
 *   npx tsx scripts/seed-kemi-think-tank-week.ts
 *
 * Idempotent — wipes any existing Think Tank tasks on the same dates for
 * Kemi before re-inserting.
 *
 * Requires migration 018_think_tank.sql.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const PUZZLE_ORDER = [
  "Three Friends, Three Lunches",
  "The Pet Parade",
  "Favorite Colors",
  "Four Birthday Months",
  "The Sleepover",
];

function nextMonday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // Sunday=0, Mon=1
  const daysUntilMon = dow === 0 ? 1 : dow === 1 ? 7 : 8 - dow;
  d.setDate(d.getDate() + daysUntilMon);
  return d;
}

function isoDate(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

async function main() {
  // 1. Resolve Kemi
  const { data: kemi, error: uErr } = await supa
    .from("users")
    .select("id, display_name")
    .eq("role", "kid")
    .eq("display_name", "Kemi")
    .maybeSingle();
  if (uErr) throw uErr;
  if (!kemi) throw new Error("Kemi not found. Run /api/admin/seed-kemi first.");
  console.log(`✓ Kemi: ${kemi.id}`);

  // 2. Resolve the five puzzles in order
  const { data: puzzles, error: pErr } = await supa
    .from("game_content")
    .select("id, payload")
    .eq("game_slug", "think-tank")
    .eq("content_type", "think_tank_puzzle")
    .eq("status", "live");
  if (pErr) throw pErr;
  if (!puzzles || puzzles.length === 0) {
    throw new Error("No Think Tank puzzles found. Run seed-think-tank-week1.ts first.");
  }
  const byTitle = new Map<string, string>();
  for (const row of puzzles) {
    const title = (row.payload as { title?: string })?.title;
    if (title) byTitle.set(title, row.id);
  }
  const ordered = PUZZLE_ORDER.map((title) => {
    const id = byTitle.get(title);
    if (!id) throw new Error(`Puzzle "${title}" not in DB. Re-run seed-think-tank-week1.ts.`);
    return { title, id };
  });
  console.log(`✓ ${ordered.length} puzzles resolved`);

  // 3. Compute next week's Mon–Fri
  const monday = nextMonday();
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return isoDate(d);
  });
  console.log(`✓ scheduling: ${days[0]} → ${days[4]}`);

  // 4. Wipe + re-insert per day
  let inserted = 0;
  for (let i = 0; i < days.length; i++) {
    const date = days[i];
    const puzzle = ordered[i];

    // Remove any existing Think Tank task for that date so re-runs are clean.
    // (We match by lesson_slug, NOT by puzzle id — so a manual edit doesn't
    // accidentally survive a re-seed.)
    const { error: delErr } = await supa
      .from("tasks")
      .delete()
      .eq("user_id", kemi.id)
      .eq("date", date)
      .eq("lesson_slug", "think-tank");
    if (delErr) throw delErr;

    const { error: insErr } = await supa.from("tasks").insert({
      user_id: kemi.id,
      date,
      title: `Think Tank — ${puzzle.title}`,
      description: "Read the clues, mark each cell Y/N, then check your work.",
      type: "homeschool",
      subject: "Logic",
      completion_type: "lesson",
      lesson_slug: "think-tank",
      scheduled_time: "09:00",
      estimated_minutes: 15,
      sort_order: 10,
      metadata: { puzzle_id: puzzle.id },
    });
    if (insErr) throw insErr;
    inserted++;
    console.log(`  + ${date} · ${puzzle.title}`);
  }

  // 5. Make sure the week is published so /me actually shows it.
  const weekStart = days[0];
  const { error: wsErr } = await supa
    .from("week_status")
    .upsert(
      { week_start_date: weekStart, status: "published", published_at: new Date().toISOString() },
      { onConflict: "week_start_date" }
    );
  if (wsErr) throw wsErr;
  console.log(`✓ week ${weekStart} marked published`);

  console.log(`\nDone. ${inserted} Think Tank tasks scheduled for Kemi.`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function loadDotEnv() {
  try {
    const txt = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const value = m[2].replace(/^"(.*)"$/, "$1");
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  } catch {
    /* fine */
  }
}
