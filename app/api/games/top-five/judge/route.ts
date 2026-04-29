import { NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const VERDICT_TAGS = ["based", "reach", "interesting", "disrespectful", "cap"] as const;

// Used to validate after manual JSON.parse — never sent to Anthropic.
const VerdictSchema = z.object({
  rating: z.number(),
  take: z.string(),
  per_pick: z.array(
    z.object({
      name: z.string(),
      verdict: z.enum(VERDICT_TAGS),
    })
  ),
});

const SYSTEM_PROMPT = `You are a trash-talking but knowledgeable NBA expert. You rate users' Top 5 lists for Jaiye Sobo's NBA games platform. Be specific. Reference real basketball history. Don't be generic. Don't be cruel — make it fun. Audience includes kids, so keep it spirited but clean.

You MUST respond with ONLY a JSON object. No prose before, no prose after, no markdown code fence.

Schema:
{
  "rating": (integer 1-10),
  "take": (string, ONE sentence verdict, 25 words max),
  "per_pick": [
    { "name": (the user's pick name as you received it), "verdict": "based" | "reach" | "interesting" | "disrespectful" | "cap" }
  ]
}

Tag definitions:
- based: solid, defensible, smart pick
- reach: not bad but a stretch
- interesting: unconventional but you can see it
- disrespectful: snubs someone obviously better
- cap: lying / not even close`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "missing_key" }, { status: 501 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { play_id } = body as { play_id?: unknown };
  if (typeof play_id !== "string") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { data: play } = await supa.from("plays").select("*").eq("id", play_id).maybeSingle();
  if (!play || play.game_slug !== "top-five") {
    return NextResponse.json({ error: "play_not_found" }, { status: 404 });
  }

  if (play.result && typeof play.result === "object" && "rating" in play.result) {
    return NextResponse.json({ verdict: play.result });
  }

  const payload = play.payload as { prompt_text?: string; picks?: string[] };
  const prompt = payload?.prompt_text ?? "Top 5";
  const picks = (payload?.picks ?? []).slice(0, 5);
  if (picks.length !== 5) {
    return NextResponse.json({ error: "invalid_picks" }, { status: 400 });
  }

  const userPrompt = `Prompt: ${prompt}\n\nUser's Top 5:\n${picks
    .map((p, i) => `${i + 1}. ${p}`)
    .join("\n")}\n\nReturn the JSON verdict.`;

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-5"),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });

    // Extract JSON object from the response (model is told no prose, but be defensive).
    const jsonText = extractJson(text);
    if (!jsonText) throw new Error(`No JSON found in response: ${text.slice(0, 200)}`);

    const parsed = JSON.parse(jsonText);
    const validated = VerdictSchema.parse(parsed);

    // Normalize: clamp rating, truncate take, ensure 5 per_pick rows aligned to user picks.
    const verdict = {
      rating: Math.max(1, Math.min(10, Math.round(validated.rating))),
      take: validated.take.slice(0, 280),
      per_pick: picks.map((name, i) => {
        const found =
          validated.per_pick.find((p) => p.name.toLowerCase().trim() === name.toLowerCase().trim()) ??
          validated.per_pick[i];
        return { name, verdict: found?.verdict ?? "interesting" };
      }),
    };

    await supa.from("plays").update({ result: verdict }).eq("id", play_id);
    return NextResponse.json({ verdict });
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error(
      JSON.stringify({ scope: "games.top-five.judge", play_id, picks_count: picks.length, err: detail })
    );
    return NextResponse.json({ error: "ai_failed", detail }, { status: 502 });
  }
}

/** Pull the first {...} JSON block out of a string — tolerates surrounding prose. */
function extractJson(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  // Strip ``` fences if present
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fence) return fence[1].trim();
  // Find the first { ... balanced } pair
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
