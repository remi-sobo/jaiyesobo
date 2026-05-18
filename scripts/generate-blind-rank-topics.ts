/**
 * CLI for generating a single Blind Rank topic without going through the
 * admin UI. Inserts the result as a DRAFT (verification_status='pending').
 *
 * Usage:
 *   npx tsx scripts/generate-blind-rank-topics.ts \
 *     --topic "All-Time Scorers" \
 *     --criteria "Total career NBA points" \
 *     [--difficulty easy|medium|hard] \
 *     [--category all-time-players]
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateBlindRankTopic } from "@/lib/games/blind-rank-generate";
import {
  isBlindRankDifficulty,
  type BlindRankDifficulty,
} from "@/lib/games/blind-rank";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
requireEnv("ANTHROPIC_API_KEY");

const supa = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function parseArgs(): {
  topic: string;
  criteria: string;
  difficulty: BlindRankDifficulty;
  category: string;
} {
  const argv = process.argv.slice(2);
  let topic: string | null = null;
  let criteria: string | null = null;
  let difficulty: BlindRankDifficulty = "medium";
  let category = "general";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--topic" || a === "-t") topic = argv[++i];
    else if (a === "--criteria" || a === "-c") criteria = argv[++i];
    else if (a === "--difficulty" || a === "-d") {
      const v = argv[++i];
      if (isBlindRankDifficulty(v)) difficulty = v;
      else throw new Error(`Invalid difficulty: ${v}`);
    } else if (a === "--category") category = argv[++i];
  }
  if (!topic) throw new Error("--topic <text> is required");
  if (!criteria) throw new Error("--criteria <text> is required");
  return { topic, criteria, difficulty, category };
}

async function main() {
  const args = parseArgs();
  console.log(`Generating Blind Rank topic: "${args.topic}" (${args.difficulty}, ${args.category})`);
  const generated = await generateBlindRankTopic(args);
  if (!generated.ok) {
    console.error(`✗ ${generated.error}`);
    process.exit(2);
  }

  console.log(`✓ Generated: "${generated.payload.title}"`);
  for (const item of generated.payload.items) {
    console.log(`  ${String(item.rank).padStart(2)}. ${item.name} — ${item.fact}`);
  }

  const { data, error } = await supa
    .from("game_content")
    .insert({
      game_slug: "blind-rank",
      content_type: "blind_rank_topic",
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
  console.log(`Verify at: /games-admin/blind-rank/${data.id}/verify`);
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
