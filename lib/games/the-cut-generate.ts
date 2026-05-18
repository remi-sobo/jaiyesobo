/**
 * Shared AI generation logic for The Cut. Used by:
 *  - /api/games-admin/cut-sets/generate (admin curator endpoint)
 *  - scripts/generate-cut-sets.ts (single-set CLI)
 *  - scripts/seed-cut-launch-sets.ts (10-set bootstrap)
 *
 * Output is always validated against normalizeCutSetPayload — every set MUST
 * have exactly 4 keeps and 4 cuts before it's saved.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import {
  isCutSetDifficulty,
  normalizeCutSetPayload,
  type CutSetDifficulty,
  type CutSetPayload,
} from "./the-cut";

const SYSTEM_PROMPT = `You are an NBA historian curating a "keep 4 / cut 4" puzzle for a kid-friendly NBA game. Given a criterion and difficulty, generate exactly 8 NBA player names where:
- 4 satisfy the criterion (is_keep: true)
- 4 are plausible distractors who do NOT satisfy it (is_keep: false)

Each item:
- name: the player's full proper name (e.g. "Kobe Bryant", "Manu Ginóbili")
- is_keep: boolean
- fact: ONE crisp sentence explaining the connection (for keeps) or why they're a near-miss (for cuts). Include specific years/numbers when possible.

The distractors should be CLOSE — same era, similar accolades, similar position, similar reputation. The puzzle should be hard enough that a casual fan gets 2-3 right but a die-hard could get all 4.

Difficulty guidance:
- easy: well-known players the criterion is famous for; distractors are obvious near-misses
- medium: mix of household names + a deeper cut or two; distractors share strong surface signals
- hard: at least one deep-cut keep most fans forget; distractors are extremely plausible

Output ONLY valid JSON in this exact schema:
{
  "title": (3-6 word puzzle title, no period),
  "criterion_summary": (one short phrase describing the keep criterion),
  "easy_prompt": (sentence shown in easy mode, e.g. "Keep the players who won Sixth Man of the Year. Cut the imposters."),
  "hard_prompt": "Four of these belong together. Find them.",
  "category": (one-word category, e.g. "awards", "champions", "scoring", "draft", "teams", "college", "international"),
  "difficulty": "easy" | "medium" | "hard",
  "items": [
    { "name": "...", "is_keep": true, "fact": "..." },
    ...
  ]
}

CRITICAL: items array MUST contain exactly 8 objects, with exactly 4 is_keep:true and 4 is_keep:false. Do not output more or fewer.`;

const ItemSchema = z.object({
  name: z.string().min(1).max(80),
  is_keep: z.boolean(),
  fact: z.string().min(1).max(280),
});

const CutSetSchema = z.object({
  title: z.string().min(1).max(120),
  criterion_summary: z.string().min(1).max(160),
  easy_prompt: z.string().min(1).max(280),
  hard_prompt: z.string().min(1).max(280),
  category: z.string().min(1).max(40),
  difficulty: z.enum(["easy", "medium", "hard"]),
  items: z.array(ItemSchema).length(8),
});

export type GenerateCutSetInput = {
  criterion: string;
  difficulty?: CutSetDifficulty;
  category?: string;
};

export type GenerateCutSetSuccess = {
  ok: true;
  payload: CutSetPayload;
};

export type GenerateCutSetFailure = {
  ok: false;
  error: string;
};

export async function generateCutSet(
  input: GenerateCutSetInput
): Promise<GenerateCutSetSuccess | GenerateCutSetFailure> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY not configured" };
  }
  const criterion = input.criterion.trim();
  if (!criterion) return { ok: false, error: "criterion is required" };
  const difficulty: CutSetDifficulty = isCutSetDifficulty(input.difficulty)
    ? input.difficulty
    : "medium";
  const category = input.category?.trim() || "general";

  const userPrompt = `CRITERION: ${criterion}
DIFFICULTY: ${difficulty}
CATEGORY HINT: ${category}

Generate the puzzle now. Remember: exactly 4 keeps and 4 cuts.`;

  let raw: z.infer<typeof CutSetSchema>;
  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: CutSetSchema,
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

  const normalized = normalizeCutSetPayload({
    ...raw,
    // Server-enforced category override (only if AI omitted)
    category: raw.category || category,
  });
  if (!normalized.ok) {
    return { ok: false, error: `validation: ${normalized.error}` };
  }
  return { ok: true, payload: normalized.payload };
}
