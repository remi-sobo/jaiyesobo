import { NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import {
  type DraftWheelPlayPayload,
  type DraftWheelVerdict,
  type WheelSide,
  isComplete,
  WHEEL_SLOTS,
} from "@/lib/games/draft-wheel";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a sharp, kid-friendly NBA analyst — Mike Breen on the call.

You're judging Draft Wheel. Two players took 5 turns each. Each turn the WHEEL gave each player a RANDOM franchise — they had to pick the best player available at that slot's position from THAT team. So credit smart picks under constraint, call out lucky pulls (e.g. "you got the Hornets at C and STILL came up with Mourning? BANG!"), and when somebody hit on a thin franchise, name it.

Final lineups: G1, G2, F1, F2, C — five slots each.

Pick a winner based on:
- Star power / ceiling at each slot
- Roster fit + balance (the slots are fixed, so positional fit matters)
- Iconic-ness
- How well each player navigated the random teams they were dealt

Then SIMULATE a best-of-7 series between these two starting fives. Decide the
score (4-0, 4-1, 4-2, 4-3 from the winner's POV — or "3-3" only if tie). Tell
a short story about how it played out: which game flipped it, who showed up
when it mattered, the moment that took it over the top. Reference real
players by name. Imagine a TNT halftime hit, not a press release.

Be specific everywhere. No generic praise. Audience includes kids — keep it
spirited but clean. The "a" / "b" labels are just side IDs — use the actual
player names provided in the user message when writing your output.

You MUST respond with ONLY a JSON object. No prose before or after, no markdown fences.

Schema:
{
  "winner": "a" | "b" | "tie",
  "a_grade": (string letter grade like "A-", "B+", "C"),
  "b_grade": (string letter grade like "A-", "B+", "C"),
  "a_summary": (one or two sentences on the A roster, ≤45 words),
  "b_summary": (one or two sentences on the B roster, ≤45 words),
  "slot_calls": [
    { "slot": "G1" | "G2" | "F1" | "F2" | "C", "winner": "a" | "b" | "even", "line": (≤25 words, name the matchup) }
  ],  // exactly 5, in order G1, G2, F1, F2, C
  "verdict": (one sentence closer naming the winner and why, ≤30 words),
  "series_score": (string like "4-0" / "4-1" / "4-2" / "4-3", or "3-3" only if tie),
  "series_story": (1-3 sentences, ≤70 words, naming the moment/player that decided the series)
}`;

const VerdictSchema = z.object({
  winner: z.enum(["a", "b", "tie"]),
  a_grade: z.string().min(1).max(4),
  b_grade: z.string().min(1).max(4),
  a_summary: z.string().min(1).max(400),
  b_summary: z.string().min(1).max(400),
  slot_calls: z
    .array(
      z.object({
        slot: z.enum(["G1", "G2", "F1", "F2", "C"]),
        winner: z.enum(["a", "b", "even"]),
        line: z.string().min(1).max(220),
      })
    )
    .min(5)
    .max(5),
  verdict: z.string().min(1).max(300),
  series_score: z.string().min(1).max(10).optional(),
  series_story: z.string().min(1).max(600).optional(),
});

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
  const { data: play } = await supa
    .from("plays")
    .select("id, payload, result, game_slug")
    .eq("id", play_id)
    .maybeSingle();
  if (!play || play.game_slug !== "draft-wheel") {
    return NextResponse.json({ error: "play_not_found" }, { status: 404 });
  }

  // Idempotent
  if (play.result && typeof play.result === "object" && "winner" in play.result) {
    return NextResponse.json({ verdict: play.result });
  }

  const payload = play.payload as DraftWheelPlayPayload;
  if (!isComplete(payload)) {
    return NextResponse.json({ error: "game_incomplete" }, { status: 400 });
  }

  const userPrompt = buildUserPrompt(payload);

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      maxOutputTokens: 1200,
    });
    const jsonText = extractJson(text);
    if (!jsonText) throw new Error(`no_json: ${text.slice(0, 200)}`);
    const parsed = JSON.parse(jsonText);
    const validated = VerdictSchema.parse(parsed);

    // Sanity: ensure slot_calls are returned in the canonical order. If not,
    // sort them so the UI can render in order without surprises.
    const slotOrder = WHEEL_SLOTS as readonly string[];
    const sorted = [...validated.slot_calls].sort(
      (a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot)
    );

    const verdict: DraftWheelVerdict = {
      winner: validated.winner as WheelSide | "tie",
      a_grade: validated.a_grade,
      b_grade: validated.b_grade,
      a_summary: validated.a_summary,
      b_summary: validated.b_summary,
      slot_calls: sorted,
      verdict: validated.verdict,
      ...(validated.series_score ? { series_score: validated.series_score } : {}),
      ...(validated.series_story ? { series_story: validated.series_story } : {}),
    };

    await supa.from("plays").update({ result: verdict }).eq("id", play_id);
    return NextResponse.json({ verdict });
  } catch (err) {
    console.error(
      JSON.stringify({
        scope: "draft-wheel.judge",
        play_id,
        err: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      })
    );
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}

function buildUserPrompt(payload: DraftWheelPlayPayload): string {
  const a = payload.player_names.a;
  const b = payload.player_names.b;
  const lines: string[] = [];
  lines.push(
    `Two-player Draft Wheel. Side "a" = ${a}. Side "b" = ${b}. Each had ONE re-roll.\n`
  );
  for (const r of payload.rounds) {
    lines.push(`Round ${r.index + 1} — ${r.slot} (${r.position}):`);
    if (r.pick_a && r.a) {
      lines.push(
        `  ${a} got the ${r.a.team.city} ${r.a.team.name}${r.a.rerolled ? " (re-rolled)" : ""} → ${r.pick_a.player_name}${
          r.pick_a.peak_label ? ` — ${r.pick_a.peak_label}` : ""
        }`
      );
    }
    if (r.pick_b && r.b) {
      lines.push(
        `  ${b} got the ${r.b.team.city} ${r.b.team.name}${r.b.rerolled ? " (re-rolled)" : ""} → ${r.pick_b.player_name}${
          r.pick_b.peak_label ? ` — ${r.pick_b.peak_label}` : ""
        }`
      );
    }
  }
  lines.push("");
  lines.push("Judge it. Return JSON only.");
  return lines.join("\n");
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
