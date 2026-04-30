/**
 * Pre-seed Power Hour + Lunch anchors for Jaiye.
 * Idempotent — skips if anchors with these titles already exist.
 *
 * Run: npx tsx scripts/seed-default-anchors.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

type Seed = {
  title: string;
  subtitle: string | null;
  emoji: string;
  start_time: string;
  end_time: string;
  recurring_pattern: string;
};

const ANCHORS: Seed[] = [
  {
    title: "Power Hour",
    subtitle: "English focus",
    emoji: "⚡",
    start_time: "08:00",
    end_time: "09:00",
    recurring_pattern: "weekdays",
  },
];

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

async function main() {
  const { data: jaiye, error: uErr } = await supa
    .from("users")
    .select("id")
    .eq("role", "kid")
    .limit(1)
    .maybeSingle();
  if (uErr) throw uErr;
  if (!jaiye) throw new Error("No Jaiye user. Run seed.ts first.");

  const { data: existing } = await supa
    .from("time_anchors")
    .select("title")
    .eq("user_id", jaiye.id);
  const existingTitles = new Set((existing ?? []).map((a) => a.title));

  let added = 0;
  let skipped = 0;
  for (const a of ANCHORS) {
    if (existingTitles.has(a.title)) {
      console.log(`  • ${a.title}: already exists — skip`);
      skipped++;
      continue;
    }
    const { error } = await supa.from("time_anchors").insert({
      user_id: jaiye.id,
      title: a.title,
      subtitle: a.subtitle,
      emoji: a.emoji,
      start_time: a.start_time,
      end_time: a.end_time,
      recurring_pattern: a.recurring_pattern,
      date: null,
    });
    if (error) {
      console.error(`  ✗ ${a.title}:`, error.message);
      continue;
    }
    console.log(`  ✓ ${a.title} added (${a.emoji} ${a.start_time}-${a.end_time}, ${a.recurring_pattern})`);
    added++;
  }
  console.log(`\nDone. Added ${added}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error("\nFailed:", err);
  process.exit(1);
});
