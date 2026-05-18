/**
 * Generate the 20 launch Blind Rank topics by calling the same AI generation
 * logic the admin endpoint uses. Saves each as DRAFT (verification_status='pending')
 * so curators can verify the ranking before going live.
 *
 * Run: npx tsx scripts/seed-blind-rank-launch.ts
 *
 * Idempotent on topic — re-running skips topics whose title is already present.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateBlindRankTopic } from "@/lib/games/blind-rank-generate";
import type { BlindRankDifficulty } from "@/lib/games/blind-rank";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
requireEnv("ANTHROPIC_API_KEY");

const supa = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Starter = {
  topic: string;
  criteria: string;
  difficulty: BlindRankDifficulty;
  category: string;
};

const STARTERS: Starter[] = [
  // ───── Player rankings ─────
  {
    topic: "All-Time Scorers",
    criteria: "Total NBA career points. Defensible by raw count.",
    difficulty: "easy",
    category: "all-time-players",
  },
  {
    topic: "All-Time Centers",
    criteria: "Peak greatness at the center position. Rings, MVPs, dominance.",
    difficulty: "medium",
    category: "all-time-players",
  },
  {
    topic: "All-Time Point Guards",
    criteria: "Peak greatness at PG. Rings, MVPs, assists, era impact.",
    difficulty: "medium",
    category: "all-time-players",
  },
  {
    topic: "All-Time Shooting Guards",
    criteria: "Peak greatness at SG. Rings, scoring titles, signature moments.",
    difficulty: "medium",
    category: "all-time-players",
  },
  {
    topic: "All-Time Small Forwards",
    criteria: "Peak greatness at SF. Rings, MVPs, two-way dominance.",
    difficulty: "medium",
    category: "all-time-players",
  },
  {
    topic: "All-Time Power Forwards",
    criteria: "Peak greatness at PF. Rings, MVPs, post and perimeter impact.",
    difficulty: "medium",
    category: "all-time-players",
  },
  {
    topic: "Greatest Dunkers Ever",
    criteria: "Peak athleticism, signature dunks, and dunk-contest / highlight legacy.",
    difficulty: "easy",
    category: "all-time-players",
  },
  {
    topic: "Greatest Shooters Ever",
    criteria: "Career 3PT %, volume, clutch makes, and influence on the modern game.",
    difficulty: "medium",
    category: "all-time-players",
  },

  // ───── Era-specific ─────
  {
    topic: "Best of the 1990s",
    criteria: "Peak performance during the 1990s specifically. Rings, MVPs, signature moments that decade.",
    difficulty: "medium",
    category: "era",
  },
  {
    topic: "Best of the 2000s",
    criteria: "Peak performance during the 2000s specifically. Awards and rings IN that decade.",
    difficulty: "medium",
    category: "era",
  },
  {
    topic: "Best of the 2010s",
    criteria: "Peak performance during the 2010s. Awards, rings, and impact IN that decade.",
    difficulty: "medium",
    category: "era",
  },
  {
    topic: "Best Active Players Right Now",
    criteria:
      "Best NBA players currently active as of the 2025–26 season. Recent MVPs, rings, current performance.",
    difficulty: "easy",
    category: "era",
  },
  {
    topic: "Best Rookies of the Last 10 Years",
    criteria: "Rookie of the Year quality + career trajectory since debut. 2015–2024 rookie classes.",
    difficulty: "medium",
    category: "era",
  },

  // ───── Achievement-based ─────
  {
    topic: "Most Championships Won as a Player",
    criteria: "Total NBA championship rings as a player. Pure ring count.",
    difficulty: "easy",
    category: "achievement",
  },
  {
    topic: "Most Regular-Season MVPs",
    criteria: "Total regular-season MVP awards. Pure count.",
    difficulty: "easy",
    category: "achievement",
  },
  {
    topic: "Most Iconic Finals Moments",
    criteria:
      "Single most iconic Finals moments in NBA history — clutch shots, defensive stops, signature plays. Ranked by cultural resonance + stakes.",
    difficulty: "hard",
    category: "achievement",
  },
  {
    topic: "Best Olympic Team USA Players",
    criteria: "Olympic gold medals + role on the team + finals/medal-round impact.",
    difficulty: "medium",
    category: "achievement",
  },

  // ───── Wild card ─────
  {
    topic: "Best NBA Nicknames",
    criteria: "Cultural resonance, longevity, fit with the player, and recognizability.",
    difficulty: "easy",
    category: "wildcard",
  },
  {
    topic: "Best Crossovers Ever",
    criteria: "Signature ball-handling moves — frequency, success vs elite defenders, video-game iconic.",
    difficulty: "medium",
    category: "wildcard",
  },
  {
    topic: "Most Unstoppable in Their Prime",
    criteria:
      "Peak two-to-three-year dominance — could not be stopped offensively or defensively in that window.",
    difficulty: "hard",
    category: "wildcard",
  },
];

async function main() {
  // Pre-fetch existing titles to avoid duplicates on re-run.
  const { data: existing } = await supa
    .from("game_content")
    .select("payload")
    .eq("game_slug", "blind-rank")
    .eq("content_type", "blind_rank_topic");
  const haveTitles = new Set(
    (existing ?? [])
      .map((r) =>
        ((r.payload as { title?: string }) ?? {}).title?.toLowerCase().trim()
      )
      .filter((t): t is string => !!t)
  );

  let added = 0;
  let skipped = 0;
  for (const s of STARTERS) {
    if (haveTitles.has(s.topic.toLowerCase().trim())) {
      console.log(`  • ${s.topic}: already exists — skip`);
      skipped++;
      continue;
    }
    process.stdout.write(`  → ${s.topic} (${s.difficulty})… `);
    const generated = await generateBlindRankTopic({
      topic: s.topic,
      criteria: s.criteria,
      difficulty: s.difficulty,
      category: s.category,
    });
    if (!generated.ok) {
      console.log(`✗ ${generated.error}`);
      continue;
    }
    const { error } = await supa.from("game_content").insert({
      game_slug: "blind-rank",
      content_type: "blind_rank_topic",
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
    console.log(`✓ ${generated.payload.title}`);
    added++;
  }
  console.log(`\nDone. Added ${added}, skipped ${skipped}, total ${STARTERS.length}.`);
  console.log(`Visit /games-admin/blind-rank to verify and publish.`);
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
