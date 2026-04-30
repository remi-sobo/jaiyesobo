/**
 * Seed today's "Games Platform — Curator Onboarding" task for Jaiye.
 * Idempotent: skips if a task with this lesson_slug already exists for today.
 *
 * Run: npx tsx scripts/add-games-curator-task.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
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
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* noop */
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const { data: jaiye, error: uErr } = await supa
    .from("users")
    .select("id")
    .eq("role", "kid")
    .limit(1)
    .maybeSingle();
  if (uErr) throw uErr;
  if (!jaiye) throw new Error("No Jaiye user. Run scripts/seed.ts first.");

  const date = todayIso();
  const { data: existing } = await supa
    .from("tasks")
    .select("id")
    .eq("user_id", jaiye.id)
    .eq("date", date)
    .eq("lesson_slug", "games-curator-onboarding")
    .maybeSingle();
  if (existing) {
    console.log(`  ✓ Curator onboarding already seeded for ${date} (${existing.id}). Skipping.`);
    return;
  }

  const { data, error } = await supa
    .from("tasks")
    .insert({
      user_id: jaiye.id,
      date,
      title: "Games Platform — Curator Onboarding",
      description:
        "Visit /games, play Top 5 once, brainstorm prompts. About 30 minutes. This is your first curator job.",
      type: "homeschool",
      subject: "Other",
      completion_type: "lesson",
      lesson_slug: "games-curator-onboarding",
      requires_photo: false,
      sort_order: 200,
    })
    .select()
    .single();
  if (error) {
    console.error("Failed:", error);
    process.exit(1);
  }
  console.log(`  ✓ Curator onboarding task added for ${date} (${data.id})`);
}

main().catch((err) => {
  console.error("\nFailed:", err);
  process.exit(1);
});
