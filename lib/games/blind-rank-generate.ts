/**
 * Shared AI generation logic for Blind Rank topics. Used by the admin endpoint
 * and the seed / CLI scripts. Output is always validated against
 * normalizeBlindRankTopicPayload before it can be saved as a draft.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import {
  isBlindRankDifficulty,
  normalizeBlindRankTopicPayload,
  POOL_MAX,
  POOL_MIN,
  type BlindRankDifficulty,
  type BlindRankTopicPayload,
} from "./blind-rank";

const SYSTEM_PROMPT = `You are an NBA historian curating a "Blind Rank" puzzle for a kid-friendly NBA game. Given a topic and criteria, generate an AUTHORITATIVE ordered ranking of exactly 10 NBA-related items.

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

  const userPrompt = `TOPIC: ${topic}
CRITERIA: ${criteria}
DIFFICULTY: ${difficulty}
CATEGORY HINT: ${category}

Generate the authoritative top 10 ranking now. Remember: exactly 10 items, ranks 1..10, no gaps.`;

  let raw: z.infer<typeof TopicSchema>;
  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: TopicSchema,
      system: SYSTEM_PROMPT,
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
  });
  if (!normalized.ok) {
    return { ok: false, error: `validation: ${normalized.error}` };
  }
  return { ok: true, payload: normalized.payload };
}
