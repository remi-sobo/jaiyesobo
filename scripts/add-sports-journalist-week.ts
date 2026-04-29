/**
 * Seed Mon-Fri Sports Journalist Lab tasks for this week.
 * Idempotent: skips dates already seeded with the same lesson_slug.
 * Run: npx tsx scripts/add-sports-journalist-week.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// Mon–Fri of the current week (2026-04-27 to 2026-05-01).
const DATES = ["2026-04-27", "2026-04-28", "2026-04-29", "2026-04-30", "2026-05-01"];

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
  const { data: jaiye, error: jErr } = await supa
    .from("users")
    .select("id")
    .eq("role", "kid")
    .limit(1)
    .maybeSingle();
  if (jErr) throw jErr;
  if (!jaiye) throw new Error("No Jaiye user. Run seed.ts first.");

  let added = 0;
  let skipped = 0;
  for (const date of DATES) {
    const { data: existing } = await supa
      .from("tasks")
      .select("id")
      .eq("user_id", jaiye.id)
      .eq("date", date)
      .eq("lesson_slug", "sports-journalist-lab")
      .maybeSingle();
    if (existing) {
      console.log(`  • ${date}: already seeded (${existing.id}) — skip`);
      skipped++;
      continue;
    }

    const { data, error } = await supa
      .from("tasks")
      .insert({
        user_id: jaiye.id,
        date,
        title: "Playoff Recap Article (typed) — Sports Desk lesson",
        description:
          "Pick a game from yesterday's playoffs. Watch the recap. Write the article. Get AI feedback. Revise. Submit.",
        type: "homeschool",
        subject: "Writing",
        completion_type: "lesson",
        lesson_slug: "sports-journalist-lab",
        requires_photo: false,
        sort_order: 50,
      })
      .select()
      .single();

    if (error) {
      console.error(`  ✗ ${date}: failed —`, error.message);
      continue;
    }
    console.log(`  ✓ ${date}: added (${data.id})`);
    added++;
  }

  console.log(`\nDone. Added ${added}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error("\nFailed:", err);
  process.exit(1);
});
