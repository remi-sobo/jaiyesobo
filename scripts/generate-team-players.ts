/**
 * Generate a comprehensive all-time player pool for one or all draft teams.
 * Output goes to data/draft-players-pending/<slug>.json (gitignored).
 *
 * Run: npx tsx scripts/generate-team-players.ts <slug | all>
 *   ex: npx tsx scripts/generate-team-players.ts lakers
 *       npx tsx scripts/generate-team-players.ts all
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { extractJson, validatePlayerArray } from "@/lib/draft-validate";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const aiKey = requireEnv("ANTHROPIC_API_KEY");
void aiKey;

const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const OUT_DIR = resolve(process.cwd(), "data", "draft-players-pending");

const SYSTEM_PROMPT = `You are an NBA historian building an all-time franchise draft pool.

For a given team, generate a comprehensive list of iconic players across all eras.

Include:
- All-time greats
- Multi-time All-Stars
- Championship contributors
- Beloved role players strongly associated with the team

Exclude:
- Players with under 30 games for the franchise unless they are culturally or historically significant

Each player must include:
- name
- search_aliases (3–6 useful variations — common nicknames, abbreviated names, last name only, etc.)
- primary_position (G, F, or C)
- secondary_positions (array, may be empty)
- team_stint:
  - years (e.g. "1996–2016")
  - peak_label (a short, evocative label of their peak with the franchise, e.g. "2007–08 Kobe (35.4 PPG)")
  - is_iconic (true if they're synonymous with the franchise; false otherwise)

Return ONLY a JSON array. No prose before, no prose after, no markdown code fences.

Format:
[
  {
    "name": "Kobe Bryant",
    "search_aliases": ["Kobe", "Black Mamba", "KB24", "Bean"],
    "primary_position": "G",
    "secondary_positions": ["F"],
    "team_stint": {
      "years": "1996–2016",
      "peak_label": "2007–08 Kobe (35.4 PPG, MVP)",
      "is_iconic": true
    }
  }
]

Target: 50–75 players per team.`;

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

async function getTeams(): Promise<{ slug: string; city: string; name: string }[]> {
  const { data, error } = await supa
    .from("game_content")
    .select("draft_team_slug, payload")
    .eq("game_slug", "draft")
    .eq("content_type", "draft_team")
    .order("draft_team_slug");
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as { draft_team_slug: string; payload: { city: string; name: string } };
    return { slug: row.draft_team_slug, city: row.payload.city, name: row.payload.name };
  });
}

async function generateForTeam(team: { slug: string; city: string; name: string }) {
  const userPrompt = `Generate the all-time player pool for the ${team.city} ${team.name}. Include the franchise's full history (including any predecessor cities — e.g. Sonics for Thunder, Minneapolis for Lakers). Return only the JSON array.`;

  console.log(`  → ${team.slug}: asking Claude...`);
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-5"),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
  });

  const json = extractJson(text);
  if (!json) {
    throw new Error(`No JSON found in response for ${team.slug}.\nFirst 200 chars:\n${text.slice(0, 200)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`JSON parse failed for ${team.slug}: ${String(err)}\nFirst 200 chars of extract:\n${json.slice(0, 200)}`);
  }

  const result = validatePlayerArray(parsed);
  if (!result.ok) {
    throw new Error(
      `Validation failed for ${team.slug}:\n  ${result.errors.slice(0, 5).join("\n  ")}` +
        (result.errors.length > 5 ? `\n  …and ${result.errors.length - 5} more` : "")
    );
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const outPath = resolve(OUT_DIR, `${team.slug}.json`);
  writeFileSync(outPath, JSON.stringify(result.players, null, 2) + "\n", "utf8");
  console.log(`  ✓ ${team.slug}: ${result.players.length} players → ${outPath}`);
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: npx tsx scripts/generate-team-players.ts <team-slug | all>");
    process.exit(1);
  }
  const teams = await getTeams();
  if (teams.length === 0) {
    console.error("No teams in DB. Run scripts/seed-draft-teams.ts first.");
    process.exit(1);
  }

  const targets =
    target === "all" ? teams : teams.filter((t) => t.slug === target);
  if (targets.length === 0) {
    console.error(
      `Team "${target}" not found. Available: ${teams.map((t) => t.slug).join(", ")}`
    );
    process.exit(1);
  }

  console.log(`Generating for ${targets.length} team${targets.length === 1 ? "" : "s"}...`);
  for (const t of targets) {
    try {
      await generateForTeam(t);
    } catch (err) {
      console.error(`  ✗ ${t.slug}:`, err instanceof Error ? err.message : String(err));
    }
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\nFailed:", err);
  process.exit(1);
});
