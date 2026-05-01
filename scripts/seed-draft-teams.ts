/**
 * Seed the 13 launch franchises into game_content as draft_team rows.
 * Idempotent on draft_team_slug.
 *
 * Run: npx tsx scripts/seed-draft-teams.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

type Team = {
  slug: string;
  name: string;
  city: string;
  abbreviation: string;
  primary_color: string;
  founded: string;
};

// 23 franchises (13 launch + 10 expansion). Idempotent — running this script
// re-skips rows that already exist by draft_team_slug.
const TEAMS: Team[] = [
  { slug: "lakers", name: "Lakers", city: "Los Angeles", abbreviation: "LAL", primary_color: "#552583", founded: "1947" },
  { slug: "celtics", name: "Celtics", city: "Boston", abbreviation: "BOS", primary_color: "#007A33", founded: "1946" },
  { slug: "bulls", name: "Bulls", city: "Chicago", abbreviation: "CHI", primary_color: "#CE1141", founded: "1966" },
  { slug: "warriors", name: "Warriors", city: "Golden State", abbreviation: "GSW", primary_color: "#1D428A", founded: "1946" },
  { slug: "spurs", name: "Spurs", city: "San Antonio", abbreviation: "SAS", primary_color: "#C4CED4", founded: "1967" },
  { slug: "heat", name: "Heat", city: "Miami", abbreviation: "MIA", primary_color: "#98002E", founded: "1988" },
  { slug: "knicks", name: "Knicks", city: "New York", abbreviation: "NYK", primary_color: "#006BB6", founded: "1946" },
  { slug: "pistons", name: "Pistons", city: "Detroit", abbreviation: "DET", primary_color: "#C8102E", founded: "1941" },
  { slug: "sixers", name: "76ers", city: "Philadelphia", abbreviation: "PHI", primary_color: "#006BB6", founded: "1946" },
  { slug: "rockets", name: "Rockets", city: "Houston", abbreviation: "HOU", primary_color: "#CE1141", founded: "1967" },
  { slug: "mavericks", name: "Mavericks", city: "Dallas", abbreviation: "DAL", primary_color: "#00538C", founded: "1980" },
  { slug: "thunder", name: "Thunder", city: "Oklahoma City", abbreviation: "OKC", primary_color: "#007AC1", founded: "1967" },
  { slug: "nuggets", name: "Nuggets", city: "Denver", abbreviation: "DEN", primary_color: "#0E2240", founded: "1967" },
  // Expansion batch — added round 2.
  { slug: "suns", name: "Suns", city: "Phoenix", abbreviation: "PHX", primary_color: "#E56020", founded: "1968" },
  { slug: "bucks", name: "Bucks", city: "Milwaukee", abbreviation: "MIL", primary_color: "#00471B", founded: "1968" },
  { slug: "hawks", name: "Hawks", city: "Atlanta", abbreviation: "ATL", primary_color: "#E03A3E", founded: "1946" },
  { slug: "blazers", name: "Trail Blazers", city: "Portland", abbreviation: "POR", primary_color: "#E03A3E", founded: "1970" },
  { slug: "jazz", name: "Jazz", city: "Utah", abbreviation: "UTA", primary_color: "#002B5C", founded: "1974" },
  { slug: "cavaliers", name: "Cavaliers", city: "Cleveland", abbreviation: "CLE", primary_color: "#860038", founded: "1970" },
  { slug: "raptors", name: "Raptors", city: "Toronto", abbreviation: "TOR", primary_color: "#CE1141", founded: "1995" },
  { slug: "nets", name: "Nets", city: "Brooklyn", abbreviation: "BKN", primary_color: "#000000", founded: "1967" },
  { slug: "grizzlies", name: "Grizzlies", city: "Memphis", abbreviation: "MEM", primary_color: "#5D76A9", founded: "1995" },
  { slug: "magic", name: "Magic", city: "Orlando", abbreviation: "ORL", primary_color: "#0077C0", founded: "1989" },
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
  // Pre-fetch existing slugs so we can skip duplicates.
  const { data: existing } = await supa
    .from("game_content")
    .select("draft_team_slug")
    .eq("game_slug", "draft")
    .eq("content_type", "draft_team");
  const have = new Set((existing ?? []).map((r) => (r as { draft_team_slug: string }).draft_team_slug));

  let added = 0;
  let skipped = 0;
  for (const team of TEAMS) {
    if (have.has(team.slug)) {
      console.log(`  • ${team.slug}: already exists — skip`);
      skipped++;
      continue;
    }
    const { error } = await supa.from("game_content").insert({
      game_slug: "draft",
      content_type: "draft_team",
      draft_team_slug: team.slug,
      payload: {
        name: team.name,
        city: team.city,
        abbreviation: team.abbreviation,
        primary_color: team.primary_color,
        founded: team.founded,
      },
      status: "live",
      verification_status: "verified",
      created_by_curator: false,
    });
    if (error) {
      console.error(`  ✗ ${team.slug}:`, error.message);
      continue;
    }
    console.log(`  ✓ ${team.city} ${team.name} (${team.abbreviation})`);
    added++;
  }
  console.log(`\nDone. Added ${added}, skipped ${skipped}, total ${TEAMS.length}.`);
}

main().catch((err) => {
  console.error("\nFailed:", err);
  process.exit(1);
});
