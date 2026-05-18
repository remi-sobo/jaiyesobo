/**
 * CLI for generating a single cut set without going through the admin UI.
 * Inserts the result as a DRAFT (verification_status='pending').
 *
 * Usage:
 *   npx tsx scripts/generate-cut-sets.ts \
 *     --criterion "Won Sixth Man of the Year" \
 *     [--difficulty easy|medium|hard] \
 *     [--category awards]
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateCutSet } from "@/lib/games/the-cut-generate";
import { isCutSetDifficulty, type CutSetDifficulty } from "@/lib/games/the-cut";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
requireEnv("ANTHROPIC_API_KEY");

const supa = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function parseArgs(): { criterion: string; difficulty: CutSetDifficulty; category: string } {
  const argv = process.argv.slice(2);
  let criterion: string | null = null;
  let difficulty: CutSetDifficulty = "medium";
  let category = "general";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--criterion" || a === "-c") criterion = argv[++i];
    else if (a === "--difficulty" || a === "-d") {
      const v = argv[++i];
      if (isCutSetDifficulty(v)) difficulty = v;
      else throw new Error(`Invalid difficulty: ${v}`);
    } else if (a === "--category") category = argv[++i];
  }
  if (!criterion) {
    throw new Error("--criterion <text> is required");
  }
  return { criterion, difficulty, category };
}

async function main() {
  const args = parseArgs();
  console.log(`Generating cut set: "${args.criterion}" (${args.difficulty}, ${args.category})`);
  const generated = await generateCutSet(args);
  if (!generated.ok) {
    console.error(`✗ ${generated.error}`);
    process.exit(2);
  }

  console.log(`✓ Generated: "${generated.payload.title}"`);
  for (const item of generated.payload.items) {
    console.log(`  ${item.is_keep ? "✓" : "·"} ${item.name} — ${item.fact}`);
  }

  const { data, error } = await supa
    .from("game_content")
    .insert({
      game_slug: "the-cut",
      content_type: "cut_set",
      payload: generated.payload,
      status: "draft",
      verification_status: "pending",
      created_by_curator: false,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(`Insert failed: ${error?.message ?? "unknown"}`);
    process.exit(3);
  }
  console.log(`\nSaved as draft id: ${data.id}`);
  console.log(`Verify at: /games-admin/cut-sets/${data.id}/verify`);
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
