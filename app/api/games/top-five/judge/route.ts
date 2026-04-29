import { NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const VerdictSchema = z.object({
  rating: z.number().int().min(1).max(10),
  take: z.string().max(200),
  per_pick: z
    .array(
      z.object({
        name: z.string(),
        verdict: z.enum(["based", "reach", "interesting", "disrespectful", "cap"]),
      })
    )
    .length(5),
});

const SYSTEM_PROMPT = `You are a trash-talking but knowledgeable NBA expert. You rate users' Top 5 lists for Jaiye Sobo's NBA games platform. Be specific. Reference real basketball history. Don't be generic. Don't be cruel — make it fun. Audience includes kids, so keep it spirited but clean.

Output is a JSON object with:
- rating: integer 1-10
- take: ONE sentence verdict, 25 words max
- per_pick: array of 5 objects, one per pick, each { name, verdict } where verdict is one of: based | reach | interesting | disrespectful | cap

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

  // Idempotent: if already judged, return cached verdict.
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
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: VerdictSchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });

    // Persist verdict so re-fetches and OG image generation are stable.
    await supa.from("plays").update({ result: object }).eq("id", play_id);

    return NextResponse.json({ verdict: object });
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error(
      JSON.stringify({ scope: "games.top-five.judge", play_id, picks_count: picks.length, err: detail })
    );
    return NextResponse.json({ error: "ai_failed", detail }, { status: 502 });
  }
}
