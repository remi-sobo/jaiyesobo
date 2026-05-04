import { NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { getDraftTeamBySlug } from "@/lib/draft-data";
import { gridSizeFor, validateWord, type WordSearchDifficulty } from "@/lib/games/word-search";
import { isDifficulty, slugifyTheme } from "@/lib/games/word-search-data";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are an NBA historian creating a themed word search pack for a kid-friendly game curated by Jaiye Sobo, age 8.

Generate a pack with iconic, recognizable words tied to the theme. Each word:
- 4–12 characters long
- UPPERCASE, letters only (strip spaces / hyphens / apostrophes — "Rip City" → "RIPCITY", "O'Neal" → "ONEAL")
- Iconic enough that an NBA fan would recognize it
- Each gets a one-line hint suitable for a future crossword version of this pack

Mix of: player last names, nicknames, arenas, championships, signature moves, era markers, coaches, mottos.

Title should be 3–5 words. Subtitle is a one-line tagline ≤80 chars.`;

const PackSchema = z.object({
  title: z.string().min(1).max(80),
  subtitle: z.string().min(0).max(160),
  words: z.array(
    z.object({
      word: z.string().min(1).max(40),
      hint: z.string().min(1).max(160),
    })
  ),
});

type Body = {
  team_slug?: string;
  theme_name?: string;
  difficulty?: WordSearchDifficulty;
  word_count?: number;
};

export async function POST(req: Request) {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "missing_key" }, { status: 501 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const teamSlug =
    typeof body.team_slug === "string" && body.team_slug.trim().length > 0
      ? body.team_slug.trim()
      : null;
  const themeName =
    typeof body.theme_name === "string" && body.theme_name.trim().length > 0
      ? body.theme_name.trim()
      : null;
  if (!teamSlug && !themeName) {
    return NextResponse.json({ error: "missing_theme" }, { status: 400 });
  }

  const difficulty: WordSearchDifficulty = isDifficulty(body.difficulty) ? body.difficulty : "medium";
  const targetCount = clampWordCount(body.word_count, difficulty);
  const gridSize = gridSizeFor(difficulty);

  let themeDescription: string;
  let themeTitle: string;
  let themeSlug: string;
  if (teamSlug) {
    const team = await getDraftTeamBySlug(teamSlug);
    if (!team) return NextResponse.json({ error: "team_not_found" }, { status: 404 });
    themeDescription = `${team.payload.city} ${team.payload.name} franchise history — players, coaches, era markers, championships, arenas, and lore`;
    themeTitle = `${team.payload.name} History`;
    themeSlug = slugifyTheme(`${team.payload.name}-history`);
  } else {
    themeDescription = themeName!;
    themeTitle = themeName!;
    themeSlug = slugifyTheme(themeName!);
  }

  // Avoid theme_slug collisions by appending a short suffix if taken.
  const supa = createServiceClient();
  themeSlug = await ensureUniqueThemeSlug(supa, themeSlug);

  const userPrompt = `THEME: ${themeDescription}
DIFFICULTY: ${difficulty}
TARGET WORD COUNT: ${targetCount}
MAX WORD LENGTH: ${gridSize} characters (the grid is ${gridSize}×${gridSize})

Generate ${targetCount} iconic words.`;

  let parsed: z.infer<typeof PackSchema>;
  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: PackSchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });
    parsed = object;
  } catch (err) {
    console.error(
      JSON.stringify({
        scope: "games-admin.word-packs.generate",
        err: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      })
    );
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }

  // Normalize, validate, dedupe, drop anything that won't fit.
  const seen = new Set<string>();
  const words: { word: string; hint: string }[] = [];
  const dropped: { word: string; reason: string }[] = [];
  for (const w of parsed.words) {
    const v = validateWord(w.word);
    if (!v.ok) {
      dropped.push({ word: w.word, reason: v.error });
      continue;
    }
    if (v.word.length > gridSize) {
      dropped.push({ word: w.word, reason: `longer than ${gridSize}-cell grid` });
      continue;
    }
    if (seen.has(v.word)) continue;
    seen.add(v.word);
    words.push({ word: v.word, hint: w.hint.trim() });
  }

  if (words.length < 4) {
    return NextResponse.json(
      { error: "too_few_words", dropped, words },
      { status: 502 }
    );
  }

  const payload = {
    theme_slug: themeSlug,
    team_slug: teamSlug,
    title: parsed.title.trim() || themeTitle,
    subtitle: parsed.subtitle.trim(),
    difficulty,
    grid_size: gridSize,
    words,
  };

  const { data, error } = await supa
    .from("game_content")
    .insert({
      game_slug: "word-search",
      content_type: "word_pack",
      payload,
      status: "draft",
      verification_status: "pending",
      draft_team_slug: teamSlug,
      created_by_curator: false,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(
      JSON.stringify({ scope: "games-admin.word-packs.generate.insert", err: error?.message })
    );
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, payload, dropped });
}

function clampWordCount(raw: unknown, difficulty: WordSearchDifficulty): number {
  const fallback = difficulty === "easy" ? 9 : difficulty === "hard" ? 18 : 13;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  const min = difficulty === "easy" ? 8 : difficulty === "hard" ? 16 : 12;
  const max = difficulty === "easy" ? 10 : difficulty === "hard" ? 20 : 15;
  return Math.max(min, Math.min(max, Math.round(raw)));
}

async function ensureUniqueThemeSlug(
  supa: ReturnType<typeof createServiceClient>,
  base: string
): Promise<string> {
  const { data } = await supa
    .from("game_content")
    .select("payload")
    .eq("game_slug", "word-search")
    .eq("content_type", "word_pack");
  const taken = new Set(
    (data ?? []).map((r) => (r.payload as { theme_slug?: string })?.theme_slug ?? "")
  );
  if (!taken.has(base)) return base;
  for (let i = 2; i < 50; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

