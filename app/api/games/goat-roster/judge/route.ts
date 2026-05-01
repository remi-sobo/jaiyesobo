import { NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import {
  type GoatRosterPlayPayload,
  type GoatRosterVerdict,
  ROSTER_SIZE,
} from "@/lib/goat-roster";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const VERDICT_TAGS = ["elite", "smart", "reach", "questionable"] as const;

const VerdictSchema = z.object({
  score: z.number(),
  grade: z.string().min(1).max(3),
  take: z.string().min(1).max(400),
  vibe: z.string().min(1).max(120),
  per_pick: z.array(
    z.object({
      name: z.string(),
      verdict: z.enum(VERDICT_TAGS),
    })
  ),
});

const SYSTEM_PROMPT = `You are a sharp NBA analyst rating a fan's GOAT roster — 6 players picked from one franchise's all-time pool. Picks 1-5 are STARTERS. Pick 6 is the SIXTH MAN — a high-impact bench spark, ideally a scorer or microwave who can play with any of the starters.

Score 1–100 based on:
- Star power of the starting 5
- Sixth-man fit specifically (would they thrive coming off the bench? high-volume scorer? matchup-flexible?)
- Roster balance (G/F/C — but a missing position is fine if the talent justifies it)
- Era variety / chemistry / cohesion
- Iconic-ness (synonymous-with-the-team players bump the score)

Grading scale:
- 90+: S (legendary, unimpeachable)
- 80–89: A (championship-caliber)
- 70–79: B (strong but flawed)
- 60–69: C (mid)
- below 60: D (something's off)

Tone: kid-friendly, spirited, specific. Reference real basketball history. No generic praise.

You MUST respond with ONLY a JSON object. No prose before or after, no markdown fences.

Schema:
{
  "score": (integer 1-100),
  "grade": "S" | "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D",
  "take": (1–2 sentences, ≤45 words, on the lineup overall),
  "vibe": (one phrase ≤12 words capturing the personality, e.g. "All-offense, no-D" or "Bullies + a maestro"),
  "per_pick": [
    { "name": (the user's pick name as you received it), "verdict": "elite" | "smart" | "reach" | "questionable" }
  ]
}

Verdict definitions:
- elite: no-brainer GOAT-tier choice
- smart: defensible, well-reasoned pick
- reach: not bad but a stretch
- questionable: hard to defend`;

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
  if (!play || play.game_slug !== "goat-roster") {
    return NextResponse.json({ error: "play_not_found" }, { status: 404 });
  }

  // Idempotent: return cached verdict
  if (play.result && typeof play.result === "object" && "score" in play.result) {
    return NextResponse.json({ verdict: play.result });
  }

  const payload = play.payload as GoatRosterPlayPayload;
  if (!payload || !Array.isArray(payload.picks) || payload.picks.length !== ROSTER_SIZE) {
    return NextResponse.json({ error: "invalid_picks" }, { status: 400 });
  }

  const userPrompt = `Team: ${payload.team.city} ${payload.team.name}

User's roster (5 starters + 6th man):
${payload.picks
  .map((p, i) => {
    const role = i === payload.picks.length - 1 ? "6TH MAN" : `STARTER ${i + 1}`;
    return `${role}: ${p.player_name} (${p.primary_position})`;
  })
  .join("\n")}

Score this lineup. Return JSON only.`;

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      maxOutputTokens: 1000,
    });
    const jsonText = extractJson(text);
    if (!jsonText) throw new Error(`no_json: ${text.slice(0, 200)}`);
    const parsed = JSON.parse(jsonText);
    const validated = VerdictSchema.parse(parsed);

    // Normalize: clamp score, align per_pick to user picks
    const verdict: GoatRosterVerdict = {
      score: Math.max(1, Math.min(100, Math.round(validated.score))),
      grade: validated.grade.slice(0, 3),
      take: validated.take.slice(0, 400),
      vibe: validated.vibe.slice(0, 120),
      per_pick: payload.picks.map((pick, i) => {
        const found =
          validated.per_pick.find(
            (pp) => pp.name.toLowerCase().trim() === pick.player_name.toLowerCase().trim()
          ) ?? validated.per_pick[i];
        return { name: pick.player_name, verdict: found?.verdict ?? "smart" };
      }),
    };

    await supa.from("plays").update({ result: verdict }).eq("id", play_id);
    return NextResponse.json({ verdict });
  } catch (err) {
    console.error(
      JSON.stringify({
        scope: "games.goat-roster.judge",
        play_id,
        err: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      })
    );
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
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
