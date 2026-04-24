/**
 * Seed today's EPA history lesson task for Jaiye.
 * Idempotent: if a task for 2026-04-24 with the epa-history slug already exists, it skips.
 * Run with: npx tsx scripts/add-epa-lesson.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const LESSON_DATE = "2026-04-24";

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
      if (!process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* fine */
  }
}

async function main() {
  const { data: jaiye, error: uErr } = await supa
    .from("users")
    .select("id")
    .eq("role", "kid")
    .limit(1)
    .maybeSingle();
  if (uErr) throw uErr;
  if (!jaiye) throw new Error("No Jaiye user. Run npx tsx scripts/seed.ts first.");

  const { data: existing } = await supa
    .from("tasks")
    .select("id")
    .eq("user_id", jaiye.id)
    .eq("date", LESSON_DATE)
    .eq("lesson_slug", "epa-history")
    .maybeSingle();
  if (existing) {
    console.log(`  ✓ EPA lesson already seeded for ${LESSON_DATE} (${existing.id}). Skipping.`);
    return;
  }

  const { data, error } = await supa
    .from("tasks")
    .insert({
      user_id: jaiye.id,
      date: LESSON_DATE,
      title: "EPA History — your neighborhood story",
      description:
        "Watch the videos, read the timeline, answer the questions, pick an activity, and write your reflection. Do this with Kemi together. About 45 minutes.",
      type: "homeschool",
      subject: "History",
      completion_type: "lesson",
      lesson_slug: "epa-history",
      requires_photo: false,
      sort_order: 100,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed:", error);
    process.exit(1);
  }
  console.log(`  ✓ Added EPA history lesson task for ${LESSON_DATE} (${data.id})`);
}

main().catch((err) => {
  console.error("\nFailed:", err);
  process.exit(1);
});
