/**
 * Generate the 10 launch cut sets for /games/the-cut by calling the same
 * AI generation logic the admin endpoint uses. Saves each as DRAFT
 * (verification_status='pending') so curators can verify before going live.
 *
 * Run: npx tsx scripts/seed-cut-launch-sets.ts
 *
 * Idempotent on title — re-running skips sets whose title is already in the
 * table.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateCutSet } from "@/lib/games/the-cut-generate";
import type { CutSetDifficulty } from "@/lib/games/the-cut";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
requireEnv("ANTHROPIC_API_KEY");

const supa = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Starter = {
  criterion: string;
  difficulty: CutSetDifficulty;
  category: string;
};

const STARTERS: Starter[] = [
  { criterion: "Won Sixth Man of the Year", difficulty: "medium", category: "awards" },
  { criterion: "Won Defensive Player of the Year", difficulty: "medium", category: "awards" },
  { criterion: "Scored 60+ points in a single NBA game", difficulty: "hard", category: "scoring" },
  { criterion: "Played for both the Lakers AND the Celtics in their career", difficulty: "hard", category: "teams" },
  { criterion: "Members of the 50/40/90 club (single-season)", difficulty: "hard", category: "scoring" },
  { criterion: "Members of the 1992 Dream Team", difficulty: "easy", category: "international" },
  { criterion: "Drafted #1 overall in the 2000s decade (2000-2009)", difficulty: "medium", category: "draft" },
  { criterion: "Played college basketball at Duke", difficulty: "easy", category: "college" },
  { criterion: "Won MVP with a team other than the Lakers, Bulls, or Celtics", difficulty: "medium", category: "awards" },
  { criterion: "Hall of Famers who never won an NBA championship", difficulty: "hard", category: "awards" },
];

async function main() {
  // Pre-fetch existing titles to avoid duplicates on re-run.
  const { data: existing } = await supa
    .from("game_content")
    .select("payload")
    .eq("game_slug", "the-cut")
    .eq("content_type", "cut_set");
  const haveTitles = new Set(
    (existing ?? [])
      .map((r) => ((r.payload as { title?: string }) ?? {}).title?.toLowerCase().trim())
      .filter((t): t is string => !!t)
  );
  const haveCriteria = new Set(
    (existing ?? [])
      .map((r) =>
        ((r.payload as { criterion_summary?: string }) ?? {}).criterion_summary
          ?.toLowerCase()
          .trim()
      )
      .filter((t): t is string => !!t)
  );

  let added = 0;
  let skipped = 0;
  for (const s of STARTERS) {
    if (haveCriteria.has(s.criterion.toLowerCase().trim())) {
      console.log(`  • ${s.criterion}: already exists — skip`);
      skipped++;
      continue;
    }
    process.stdout.write(`  → ${s.criterion} (${s.difficulty})… `);
    const generated = await generateCutSet({
      criterion: s.criterion,
      difficulty: s.difficulty,
      category: s.category,
    });
    if (!generated.ok) {
      console.log(`✗ ${generated.error}`);
      continue;
    }
    if (haveTitles.has(generated.payload.title.toLowerCase().trim())) {
      console.log(`✗ title collision (${generated.payload.title})`);
      continue;
    }
    const { error } = await supa.from("game_content").insert({
      game_slug: "the-cut",
      content_type: "cut_set",
      payload: generated.payload,
      status: "draft",
      verification_status: "pending",
      created_by_curator: false,
    });
    if (error) {
      console.log(`✗ ${error.message}`);
      continue;
    }
    haveTitles.add(generated.payload.title.toLowerCase().trim());
    haveCriteria.add(s.criterion.toLowerCase().trim());
    console.log(`✓ ${generated.payload.title}`);
    added++;
  }
  console.log(`\nDone. Added ${added}, skipped ${skipped}, total ${STARTERS.length}.`);
  console.log(`Visit /games-admin/cut-sets to verify and publish.`);
}

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
      let value = m[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  } catch {
    /* noop */
  }
}

main().catch((err) => {
  console.error("\nFailed:", err);
  process.exit(1);
});
