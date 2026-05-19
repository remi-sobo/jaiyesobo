/**
 * Shared AI generation logic for Blind Rank topics. Used by the admin endpoint
 * and the seed / CLI scripts. Output is always validated against
 * normalizeBlindRankTopicPayload before it can be saved as a draft.
 *
 * Two variants:
 *  - factual: AI ranks an objective category (career points, ring count) —
 *    the ranking IS the answer, scored strict positional at /finish.
 *  - opinion: AI ranks a subjective category (best dunkers, best crossover) —
 *    the ranking is THE AI's take, and /finish calls a separate judge to
 *    score the player on defensibility, not match.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import {
  isBlindRankDifficulty,
  isBlindRankKind,
  normalizeBlindRankTopicPayload,
  POOL_MAX,
  POOL_MIN,
  type BlindRankDifficulty,
  type BlindRankKind,
  type BlindRankTopicPayload,
} from "./blind-rank";

const FACTUAL_SYSTEM_PROMPT = `You are an NBA historian curating a "Blind Rank" puzzle for a kid-friendly NBA game. Given a topic and criteria, generate an AUTHORITATIVE ordered ranking of exactly 10 NBA-related items.

Each item:
- name: full proper name or clear label
- rank: integer 1..10, no gaps, no duplicates — 1 is the most/best, 10 is least but still notable
- fact: ONE crisp sentence justifying the rank with concrete evidence (stats, accolades, era context). Specific numbers > vague praise.

Your rankings must be DEFENSIBLE. Use widely-accepted criteria:
- For "all-time scorers": career points
- For "best of the 2000s": peak performance + accolades during that decade specifically
- For subjective categories: weight championships, MVPs, signature moments, era impact
- Avoid hot takes. The ordering should hold up to scrutiny from a basketball journalist.

Difficulty guidance:
- easy: well-known list where most fans can name the top few
- medium: requires real fandom knowledge for the deep ranks
- hard: distinctions between #6 vs #7 are nuanced even for diehards

Output ONLY valid JSON in this exact schema:
{
  "title": (3-6 word topic title, no period),
  "subtitle": (one short sentence explaining the criteria),
  "category": (one-word category, e.g. "all-time-players", "era", "achievement", "wildcard"),
  "difficulty": "easy" | "medium" | "hard",
  "pool_size": 10,
  "items": [
    { "name": "...", "rank": 1, "fact": "..." },
    { "name": "...", "rank": 2, "fact": "..." },
    ...
    { "name": "...", "rank": 10, "fact": "..." }
  ]
}

CRITICAL: items must contain exactly 10 entries with ranks 1..10, no gaps. Names must be unique.`;

const OPINION_SYSTEM_PROMPT = `You are an NBA pundit picking 10 items for a "Blind Rank" OPINION puzzle. The category is subjective — there's no objective right answer (think "best crossovers", "most clutch", "best uniforms"). Your job is to draft a 10-item pool the curator will let players rank.

For each item:
- name: full proper name or clear label
- rank: integer 1..10, no gaps, no duplicates — this is YOUR TAKE on the order, NOT an objective answer
- fact: ONE crisp sentence saying WHY you put them at that rank — your reasoning, not raw stats. This is the take Mike Breen would defend at the bar.

Picking the 10:
- Mix consensus picks (the obvious ones) with at least 2-3 spicier picks that COULD be #1 but are debatable
- Avoid items that are objectively #1 with no argument (boring puzzles)
- All 10 should be plausible top-5 in the topic

Difficulty guidance:
- easy: most casual fans agree on the rough order
- medium: real debate between slot 1-3 and slot 4-7
- hard: every slot is defendable

Output ONLY valid JSON in this exact schema:
{
  "title": (3-6 word topic title, no period),
  "subtitle": (one short sentence framing the OPINION criteria),
  "category": (one-word category, e.g. "opinion", "vibes", "wildcard"),
  "difficulty": "easy" | "medium" | "hard",
  "pool_size": 10,
  "items": [
    { "name": "...", "rank": 1, "fact": "..." },
    ...
    { "name": "...", "rank": 10, "fact": "..." }
  ]
}

CRITICAL: items must contain exactly 10 entries with ranks 1..10, no gaps. Names must be unique.`;

const ItemSchema = z.object({
  name: z.string().min(1).max(80),
  rank: z.number().int().min(1).max(POOL_MAX),
  fact: z.string().min(1).max(280),
});

const TopicSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().min(0).max(200),
  category: z.string().min(1).max(40),
  difficulty: z.enum(["easy", "medium", "hard"]),
  pool_size: z.number().int().min(POOL_MIN).max(POOL_MAX),
  items: z.array(ItemSchema).min(POOL_MIN).max(POOL_MAX),
});

export type GenerateBlindRankInput = {
  topic: string;
  criteria: string;
  difficulty?: BlindRankDifficulty;
  category?: string;
  kind?: BlindRankKind;
};

export type GenerateBlindRankSuccess = {
  ok: true;
  payload: BlindRankTopicPayload;
};

export type GenerateBlindRankFailure = {
  ok: false;
  error: string;
};

export async function generateBlindRankTopic(
  input: GenerateBlindRankInput
): Promise<GenerateBlindRankSuccess | GenerateBlindRankFailure> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY not configured" };
  }
  const topic = input.topic.trim();
  const criteria = input.criteria.trim();
  if (!topic) return { ok: false, error: "topic is required" };
  if (!criteria) return { ok: false, error: "criteria is required" };
  const difficulty: BlindRankDifficulty = isBlindRankDifficulty(input.difficulty)
    ? input.difficulty
    : "medium";
  const category = input.category?.trim() || "general";
  const kind: BlindRankKind = isBlindRankKind(input.kind) ? input.kind : "factual";

  const userPrompt = `TOPIC: ${topic}
CRITERIA: ${criteria}
DIFFICULTY: ${difficulty}
CATEGORY HINT: ${category}

Generate the ${kind === "opinion" ? "10-item opinion pool" : "authoritative top 10 ranking"} now. Remember: exactly 10 items, ranks 1..10, no gaps.`;

  let raw: z.infer<typeof TopicSchema>;
  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: TopicSchema,
      system: kind === "opinion" ? OPINION_SYSTEM_PROMPT : FACTUAL_SYSTEM_PROMPT,
      prompt: userPrompt,
    });
    raw = object;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    };
  }

  const normalized = normalizeBlindRankTopicPayload({
    ...raw,
    category: raw.category || category,
    pool_size: raw.pool_size ?? raw.items.length,
    kind,
  });
  if (!normalized.ok) {
    return { ok: false, error: `validation: ${normalized.error}` };
  }
  return { ok: true, payload: normalized.payload };
}
