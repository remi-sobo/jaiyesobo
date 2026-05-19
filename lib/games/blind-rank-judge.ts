/**
 * AI judge for opinion-mode Blind Rank topics.
 *
 * Called from /api/games/blind-rank/finish when the topic kind is "opinion".
 * Reads the player's ranking + the AI's preferred ranking, returns a Mike
 * Breen-voice take with a 0-100 score and per-slot reactions.
 *
 * Falls back to a heuristic score (60 + 8 * matches) if the AI call fails or
 * ANTHROPIC_API_KEY isn't set, so the game never breaks on opinion topics.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import { SLOT_COUNT, type BlindRankPlayItem } from "./blind-rank";

const SYSTEM_PROMPT = `You are Mike Breen judging an NBA fan's ranking of 5 items on the topic "{topic}". The criteria: {criteria}.

You also have your OWN ranking of these 5 items, which represents YOUR take — NOT the canonical right answer. This is an OPINION topic. Your job:

1. Read the player's ranking slot by slot.
2. For each slot, write ONE short sentence reacting in Mike Breen voice — defend the player's pick if it's reasonable, push back if it's a hot take, agree if you'd put it there too. Use specific basketball references (rings, awards, plays, eras) when you can.
3. Write one overall 1-2 sentence "take" capping the whole ranking — Mike Breen style.
4. Score the player's ranking 0-100 on how DEFENSIBLE the take is (not how much it matches yours):
   - 90-100: airtight argument, hard to disagree with
   - 75-89: very defensible, just a different lens
   - 60-74: respectable but a few choices need work
   - 40-59: bold takes that mostly don't hold up
   - 20-39: serious questions about the criteria here
   - 0-19: BANG ranking is so off it's funny

Output ONLY valid JSON in this exact schema:
{
  "take_score": (integer 0-100),
  "overall_take": "...",
  "verdict_line": "(short Mike Breen-style headline reaction to the score, like 'HEAT CHECK!' or 'Bold take!')",
  "slot_reactions": [
    { "slot": 1, "ai_take": "..." },
    { "slot": 2, "ai_take": "..." },
    { "slot": 3, "ai_take": "..." },
    { "slot": 4, "ai_take": "..." },
    { "slot": 5, "ai_take": "..." }
  ]
}`;

const SlotReactionSchema = z.object({
  slot: z.number().int().min(1).max(SLOT_COUNT),
  ai_take: z.string().min(1).max(280),
});

const JudgeSchema = z.object({
  take_score: z.number().int().min(0).max(100),
  overall_take: z.string().min(1).max(400),
  verdict_line: z.string().min(1).max(120),
  slot_reactions: z.array(SlotReactionSchema).length(SLOT_COUNT),
});

export type JudgedOpinion = z.infer<typeof JudgeSchema>;

type JudgeInput = {
  topicTitle: string;
  topicSubtitle: string;
  playItems: BlindRankPlayItem[];
  /** slot (1..5) → name placed by the player */
  playerRankingByName: Record<number, string>;
  /** slot (1..5) → name in the AI's preferred ordering */
  aiRankingByName: Record<number, string>;
};

/** Judge the player's opinion ranking. Falls back to a heuristic score if
 *  the AI call fails. Always returns a valid JudgedOpinion. */
export async function judgeOpinionRanking(input: JudgeInput): Promise<JudgedOpinion> {
  const fallback = buildFallback(input);
  if (!process.env.ANTHROPIC_API_KEY) return fallback;

  const playerLines = Array.from({ length: SLOT_COUNT }, (_, i) => {
    const slot = i + 1;
    return `  Slot ${slot}: ${input.playerRankingByName[slot] ?? "—"}`;
  }).join("\n");
  const aiLines = Array.from({ length: SLOT_COUNT }, (_, i) => {
    const slot = i + 1;
    return `  Slot ${slot}: ${input.aiRankingByName[slot] ?? "—"}`;
  }).join("\n");

  const userPrompt = `TOPIC: ${input.topicTitle}
CRITERIA: ${input.topicSubtitle || "general opinion topic"}

PLAYER'S RANKING (slot 1 = best):
${playerLines}

YOUR TAKE (for reference — slot 1 = the AI's pick for #1):
${aiLines}

Judge the player's ranking now. Stay in Mike Breen voice.`;

  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: JudgeSchema,
      system: SYSTEM_PROMPT.replace("{topic}", input.topicTitle).replace(
        "{criteria}",
        input.topicSubtitle || "general opinion topic"
      ),
      prompt: userPrompt,
    });
    return object;
  } catch (err) {
    console.error(
      JSON.stringify({
        scope: "blind-rank.judge",
        err: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      })
    );
    return fallback;
  }
}

/** Heuristic: 60 base + 8 per slot agreement with AI's order, capped 0-100.
 *  Vanilla reactions. Used when the AI call fails. */
function buildFallback(input: JudgeInput): JudgedOpinion {
  let matches = 0;
  const slotReactions = [];
  for (let slot = 1; slot <= SLOT_COUNT; slot++) {
    const player = input.playerRankingByName[slot] ?? "—";
    const ai = input.aiRankingByName[slot] ?? "—";
    const same = player === ai;
    if (same) matches += 1;
    slotReactions.push({
      slot,
      ai_take: same
        ? `${player} at #${slot} — agreed.`
        : `${player} at #${slot}? I'd have gone with ${ai}, but I see the argument.`,
    });
  }
  const score = Math.max(0, Math.min(100, 60 + matches * 8));
  return {
    take_score: score,
    overall_take:
      matches >= 4
        ? "We see this one the same way. Solid take."
        : "Bold ranking. We disagree on a few slots — defendable, but not how I'd line it up.",
    verdict_line:
      matches === 5
        ? "WE'RE IN LOCKSTEP!"
        : matches >= 3
        ? "Defendable take."
        : "BOLD CHOICES.",
    slot_reactions: slotReactions,
  };
}
