/**
 * Seed Top 5 prompts as game_content rows. Idempotent — skips prompts
 * already present.
 *
 * Run: npx tsx scripts/seed-top-five-prompts.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

type Seed = { prompt: string; category: string; tags: string[] };

const PROMPTS: Seed[] = [
  { prompt: "Top 5 Small Forwards of all time", category: "position", tags: ["positions", "all-time"] },
  { prompt: "Top 5 dunkers ever", category: "skill", tags: ["dunks", "all-time"] },
  { prompt: "Top 5 NBA logos of all time", category: "design", tags: ["logos", "branding"] },
  { prompt: "Top 5 jersey numbers", category: "design", tags: ["jerseys", "numbers"] },
  { prompt: "Top 5 Lakers of all time", category: "team", tags: ["lakers", "franchise"] },
  { prompt: "Top 5 NBA shooters ever", category: "skill", tags: ["shooting", "all-time"] },
  { prompt: "Top 5 NBA mid-range players", category: "skill", tags: ["mid-range", "all-time"] },
  { prompt: "Top 5 NBA point guards", category: "position", tags: ["positions", "point-guards"] },
  { prompt: "Top 5 NBA centers ever", category: "position", tags: ["positions", "centers"] },
  { prompt: "Top 5 NBA Finals MVPs", category: "achievement", tags: ["finals", "mvps"] },
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
  let added = 0;
  let skipped = 0;
  for (const seed of PROMPTS) {
    // Idempotency: check by prompt text on existing live rows
    const { data: existing } = await supa
      .from("game_content")
      .select("id, payload")
      .eq("game_slug", "top-five")
      .eq("content_type", "top_five_prompt");

    const already = (existing ?? []).some(
      (r) => (r.payload as { prompt?: string } | null)?.prompt === seed.prompt
    );
    if (already) {
      console.log(`  • skip: "${seed.prompt}"`);
      skipped++;
      continue;
    }

    const { error } = await supa.from("game_content").insert({
      game_slug: "top-five",
      content_type: "top_five_prompt",
      payload: seed,
      status: "live",
      created_by_curator: false,
    });
    if (error) {
      console.error(`  ✗ "${seed.prompt}":`, error.message);
      continue;
    }
    console.log(`  ✓ added: "${seed.prompt}"`);
    added++;
  }
  console.log(`\nDone. Added ${added}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
