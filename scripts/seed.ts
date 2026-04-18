/**
 * Seed script — run with: npx tsx scripts/seed.ts
 *
 * Idempotent: finds Jaiye+Dad if they already exist, then wipes today's
 * tasks and dad_note and re-inserts them. Safe to run repeatedly.
 *
 * Requires migrations 001 and 002 to have been applied in Supabase.
 */

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const jaiyePin = requireEnv("JAIYE_PIN");
const adminPin = requireEnv("ADMIN_PIN");

const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

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
    // fine — env may already be populated
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function findOrCreateUser(role: "kid" | "parent", displayName: string, pin: string) {
  const { data: existing, error: qErr } = await supa
    .from("users")
    .select()
    .eq("role", role)
    .limit(1)
    .maybeSingle();
  if (qErr) throw qErr;
  if (existing) {
    console.log(`  ✓ ${displayName} already exists (${existing.id})`);
    return existing;
  }
  const { data: created, error: iErr } = await supa
    .from("users")
    .insert({ role, display_name: displayName, pin_hash: bcrypt.hashSync(pin, 10) })
    .select()
    .single();
  if (iErr || !created) throw iErr ?? new Error(`Failed to insert ${displayName}`);
  console.log(`  ✓ Created ${displayName} (${created.id})`);
  return created;
}

type SeedTask = {
  title: string;
  description: string | null;
  type: "homeschool" | "habit" | "chore" | "ball" | "family" | "other";
  subject: string | null;
  link: string | null;
  completion_type: "photo" | "reflection" | "check" | "photo_and_reflection";
  reflection_prompt: string | null;
  requires_photo: boolean;
  sort_order: number;
  preCompleted?: boolean;
  reflectionAnswer?: string;
};

const SEEDS: SeedTask[] = [
  {
    title: "Multiplication worksheet, page 23",
    description: "All of the problems on page 23. Show your work. Say it out loud as you go.",
    type: "homeschool",
    subject: "Math",
    link: null,
    completion_type: "photo",
    reflection_prompt: null,
    requires_photo: true,
    sort_order: 10,
    preCompleted: true,
  },
  {
    title: "Big Nate: read chapter 4",
    description: "Read the whole chapter. Find the page you liked best.",
    type: "homeschool",
    subject: "Reading",
    link: null,
    completion_type: "photo_and_reflection",
    reflection_prompt: "What was your favorite page and why?",
    requires_photo: true,
    sort_order: 20,
    preCompleted: true,
    reflectionAnswer: "The part where Nate gets in trouble in art class. It made me laugh because his teacher's face.",
  },
  {
    title: "Basketball journal",
    description: "Think about what you worked on in the gym this week — drills, practice, games.",
    type: "homeschool",
    subject: "Writing",
    link: null,
    completion_type: "reflection",
    reflection_prompt: "Write 4 sentences about what you worked on in basketball this week.",
    requires_photo: false,
    sort_order: 30,
  },
  {
    title: "Watch: How plants drink water",
    description: "Watch the whole video. Pay attention to the xylem.",
    type: "homeschool",
    subject: "Science",
    link: "https://www.youtube.com/results?search_query=how+plants+drink+water",
    completion_type: "photo_and_reflection",
    reflection_prompt: "Draw what's happening inside a plant, then tell me what you learned.",
    requires_photo: true,
    sort_order: 40,
  },
  {
    title: "Read Big Nate chapter 5 out loud to Kemi",
    description: "Take a picture of you and Kemi reading together.",
    type: "homeschool",
    subject: "Reading · 4pm",
    link: null,
    completion_type: "photo",
    reflection_prompt: null,
    requires_photo: true,
    sort_order: 50,
  },
  {
    title: "Make your bed",
    description: "Pillows flat, corners tucked.",
    type: "habit",
    subject: null,
    link: null,
    completion_type: "check",
    reflection_prompt: null,
    requires_photo: false,
    sort_order: 60,
    preCompleted: true,
  },
  {
    title: "Memorize: Proverbs 3:5-6",
    description: "Trust in the Lord with all your heart...",
    type: "habit",
    subject: "Scripture",
    link: null,
    completion_type: "reflection",
    reflection_prompt: "Say it from memory, then tell me what it means to you.",
    requires_photo: false,
    sort_order: 70,
    preCompleted: true,
    reflectionAnswer: "I trust God with the stuff I can't figure out, and He'll make the path clear.",
  },
  {
    title: "Basketball practice — 15 min",
    description: "Baseline drive to the inside reverse. 10 makes each side.",
    type: "ball",
    subject: null,
    link: null,
    completion_type: "check",
    reflection_prompt: null,
    requires_photo: false,
    sort_order: 80,
  },
];

async function main() {
  console.log("→ Users...");
  const jaiye = await findOrCreateUser("kid", "Jaiye", jaiyePin);
  await findOrCreateUser("parent", "Dad", adminPin);

  const date = todayIso();

  console.log(`→ Wiping today (${date}) for Jaiye...`);
  const { error: dTasksErr } = await supa
    .from("tasks")
    .delete()
    .eq("user_id", jaiye.id)
    .eq("date", date);
  if (dTasksErr) throw dTasksErr;
  const { error: dNoteErr } = await supa.from("dad_notes").delete().eq("date", date);
  if (dNoteErr) throw dNoteErr;
  console.log("  ✓ Cleared");

  console.log(`→ Inserting ${SEEDS.length} tasks...`);
  const rows = SEEDS.map((s) => ({
    user_id: jaiye.id,
    date,
    title: s.title,
    description: s.description,
    type: s.type,
    subject: s.subject,
    link: s.link,
    completion_type: s.completion_type,
    reflection_prompt: s.reflection_prompt,
    requires_photo: s.requires_photo,
    sort_order: s.sort_order,
  }));
  const { data: inserted, error: tErr } = await supa.from("tasks").insert(rows).select();
  if (tErr || !inserted) throw tErr ?? new Error("Task insert failed");
  console.log(`  ✓ Inserted ${inserted.length}`);

  const completions = inserted
    .map((row, i) => ({ row, seed: SEEDS[i] }))
    .filter(({ seed }) => seed.preCompleted)
    .map(({ row, seed }) => ({
      task_id: row.id,
      reflection: seed.reflectionAnswer ?? null,
    }));

  if (completions.length > 0) {
    const { error: cErr } = await supa.from("completions").insert(completions);
    if (cErr) throw cErr;
    console.log(`  ✓ Marked ${completions.length} tasks complete`);
  }

  console.log("→ Dad's note...");
  const { error: nErr } = await supa.from("dad_notes").insert({
    date,
    body: "Proud of how you handled the math yesterday. Keep going — slow is smooth, smooth is fast.",
  });
  if (nErr) throw nErr;
  console.log("  ✓ Saved");

  console.log("\nDone. Re-running this script is safe — it wipes today and re-seeds.\n");
}

main().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
