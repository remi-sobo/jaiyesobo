/**
 * Generate 5 starter word packs by calling the AI generation endpoint
 * directly via the underlying Anthropic + Supabase machinery. Saves each
 * as DRAFT (verification_status='pending') so Jaiye + Dad can verify
 * before going live.
 *
 * Run: npx tsx scripts/seed-word-pack-starters.ts
 *
 * Idempotent on theme_slug — re-running skips packs whose theme_slug is
 * already in the table.
 */

import { createClient } from "@supabase/supabase-js";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  gridSizeFor,
  validateWord,
  type WordSearchDifficulty,
} from "@/lib/games/word-search";
import { slugifyTheme } from "@/lib/games/word-search-data";

loadDotEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const aiKey = requireEnv("ANTHROPIC_API_KEY");
void aiKey;

const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

type Starter = {
  themeName: string;
  themeSlug: string;
  teamSlug: string | null;
  description: string;
  difficulty: WordSearchDifficulty;
  wordCount: number;
};

const STARTERS: Starter[] = [
  {
    themeName: "Trail Blazers History",
    themeSlug: "blazers-history",
    teamSlug: "blazers",
    description:
      "Portland Trail Blazers franchise history — Rip City legends, 1977 championship, signature moments, players, coaches, era markers",
    difficulty: "medium",
    wordCount: 13,
  },
  {
    themeName: "Famous Nicknames",
    themeSlug: "famous-nicknames",
    teamSlug: null,
    description:
      "Cross-team theme: iconic NBA nicknames (e.g., MAMBA, GOAT, DIESEL, GLOVE, REIGN, MAILMAN, ADMIRAL, ICEMAN, SKYWALKER)",
    difficulty: "medium",
    wordCount: 13,
  },
  {
    themeName: "MVP Winners",
    themeSlug: "mvp-winners",
    teamSlug: null,
    description:
      "Cross-team theme: NBA regular-season MVP winners across eras (last names only — JORDAN, LEBRON, KAREEM, MAGIC, BIRD, JOKIC, GIANNIS, etc.)",
    difficulty: "medium",
    wordCount: 13,
  },
  {
    themeName: "Lakers Legends",
    themeSlug: "lakers-legends",
    teamSlug: "lakers",
    description:
      "Los Angeles Lakers franchise history — Showtime era, Mamba era, all-time greats, championships, signature plays, arenas",
    difficulty: "medium",
    wordCount: 13,
  },
  {
    themeName: "Bulls Dynasty Era",
    themeSlug: "bulls-dynasty",
    teamSlug: "bulls",
    description:
      "Chicago Bulls 1990s dynasty — Jordan, Pippen, Rodman, Phil Jackson, the threepeats, signature moments, the United Center",
    difficulty: "medium",
    wordCount: 13,
  },
];

const SYSTEM_PROMPT = `You are an NBA historian creating a themed word search pack for a kid-friendly game curated by Jaiye Sobo, age 8.

Generate a pack with iconic, recognizable words tied to the theme. Each word:
- 4–12 characters long
- UPPERCASE, letters only (strip spaces / hyphens / apostrophes — "Rip City" → "RIPCITY", "O'Neal" → "ONEAL")
- Iconic enough that an NBA fan would recognize it
- Each gets a one-line hint suitable for a future crossword version of this pack

Mix of: player last names, nicknames, arenas, championships, signature moves, era markers, coaches, mottos.

You MUST respond with ONLY a JSON object. No prose before or after, no markdown fences.

Schema:
{
  "title": (3-5 word headline for the pack),
  "subtitle": (one-line tagline, ≤80 chars),
  "words": [
    { "word": "DAMIAN", "hint": "All-time franchise leading scorer" }
  ]
}`;

async function generatePack(s: Starter): Promise<{
  title: string;
  subtitle: string;
  words: { word: string; hint: string }[];
}> {
  const gridSize = gridSizeFor(s.difficulty);
  const userPrompt = `THEME: ${s.description}
DIFFICULTY: ${s.difficulty}
TARGET WORD COUNT: ${s.wordCount}
MAX WORD LENGTH: ${gridSize} characters (the grid is ${gridSize}×${gridSize})

Generate ${s.wordCount} iconic words. Return JSON only.`;

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    maxOutputTokens: 1500,
  });
  const jsonText = extractJson(text);
  if (!jsonText) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);
  const parsed = JSON.parse(jsonText) as {
    title?: string;
    subtitle?: string;
    words?: { word?: string; hint?: string }[];
  };

  const seen = new Set<string>();
  const words: { word: string; hint: string }[] = [];
  for (const w of parsed.words ?? []) {
    if (!w?.word) continue;
    const v = validateWord(w.word);
    if (!v.ok) continue;
    if (v.word.length > gridSize) continue;
    if (seen.has(v.word)) continue;
    seen.add(v.word);
    words.push({ word: v.word, hint: (w.hint ?? "").trim() });
  }

  return {
    title: (parsed.title ?? s.themeName).trim(),
    subtitle: (parsed.subtitle ?? "").trim(),
    words,
  };
}

function extractJson(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fence) return fence[1].trim();
  const start = trimmed.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return trimmed.slice(start, i + 1);
    }
  }
  return null;
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
      // Strip surrounding quotes that vercel env pull writes
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

async function main() {
  // Pre-fetch existing theme_slugs to skip duplicates
  const { data: existing } = await supa
    .from("game_content")
    .select("payload")
    .eq("game_slug", "word-search")
    .eq("content_type", "word_pack");
  const have = new Set(
    (existing ?? []).map((r) => (r.payload as { theme_slug?: string })?.theme_slug ?? "")
  );

  let added = 0;
  let skipped = 0;
  for (const s of STARTERS) {
    const themeSlug = slugifyTheme(s.themeSlug);
    if (have.has(themeSlug)) {
      console.log(`  • ${s.themeName}: already exists — skip`);
      skipped++;
      continue;
    }
    process.stdout.write(`  → ${s.themeName}…`);
    try {
      const generated = await generatePack(s);
      if (generated.words.length < 4) {
        console.log(` ✗ AI returned too few valid words (${generated.words.length})`);
        continue;
      }
      const payload = {
        theme_slug: themeSlug,
        team_slug: s.teamSlug,
        title: generated.title,
        subtitle: generated.subtitle,
        difficulty: s.difficulty,
        grid_size: gridSizeFor(s.difficulty),
        words: generated.words,
      };
      const { error } = await supa.from("game_content").insert({
        game_slug: "word-search",
        content_type: "word_pack",
        payload,
        status: "draft",
        verification_status: "pending",
        draft_team_slug: s.teamSlug,
        created_by_curator: false,
      });
      if (error) {
        console.log(` ✗ ${error.message}`);
        continue;
      }
      console.log(` ✓ ${generated.words.length} words`);
      added++;
    } catch (err) {
      console.log(` ✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`\nDone. Added ${added}, skipped ${skipped}, total ${STARTERS.length}.`);
  console.log(`Visit /games-admin/word-packs to verify and publish.`);
}

main().catch((err) => {
  console.error("\nFailed:", err);
  process.exit(1);
});
