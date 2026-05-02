import { NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import {
  type DraftJudgement,
  type DraftPick,
  type DraftPlayPayload,
  TOTAL_PICKS,
} from "@/lib/draft-game";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT_BASE = `You are a sharp, kid-friendly NBA analyst. You're judging a snake draft from a single franchise's all-time pool. Two rosters of 5.

Pick a winner based on:
- Star power / ceiling
- Roster balance (G/F/C — but 1 missing position is OK if the talent is there)
- Era variety bonus
- Iconic-ness

Then SIMULATE the matchup as a best-of-7 playoff series. Decide the series score
(4-0, 4-1, 4-2, or 4-3 from the winner's POV — or "3-3" only if you returned
"tie") and tell a short, fun story about how it played out: which game flipped
the series, who showed up in the clutch, the moment that took it over the top.
Reference the actual drafted players by name. Keep it punchy and specific —
imagine a TNT halftime hit, not a press release.

Be specific everywhere. Reference real players. No generic praise. Audience
includes kids — keep it spirited but clean.

You MUST respond with ONLY a JSON object. No prose before or after, no markdown fences.

Schema:
{
  "winner": "human" | "ai" | "tie",
  "human_grade": (string letter grade like "A-", "B+", "C"),
  "ai_grade": (string letter grade like "A-", "B+", "C"),
  "human_summary": (one or two sentences on the human roster, ≤45 words),
  "ai_summary": (one or two sentences on the AI roster, ≤45 words),
  "verdict": (one sentence closer that names the winner and why, ≤30 words),
  "series_score": (string like "4-0" / "4-1" / "4-2" / "4-3", or "3-3" only if winner is "tie"),
  "series_story": (1-3 sentences, ≤70 words, naming the moment/player that decided the series)
}

The "human" / "ai" labels in your output are just side identifiers — use the
actual roster names provided in the user message when writing your summaries,
verdict, and series_story. Don't say "the human" or "the AI" if real names are
given.`;

const VerdictSchema = z.object({
  winner: z.enum(["human", "ai", "tie"]),
  human_grade: z.string().min(1).max(4),
  ai_grade: z.string().min(1).max(4),
  human_summary: z.string().min(1).max(400),
  ai_summary: z.string().min(1).max(400),
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
  const { data: play } = await supa.from("plays").select("*").eq("id", play_id).maybeSingle();
  if (!play || play.game_slug !== "draft") {
    return NextResponse.json({ error: "play_not_found" }, { status: 404 });
  }

  // Idempotent: if already judged, return existing
  if (play.result && typeof play.result === "object" && "winner" in play.result) {
    return NextResponse.json({ verdict: play.result });
  }

  const payload = play.payload as DraftPlayPayload;
  if (!payload || !Array.isArray(payload.picks) || payload.picks.length !== TOTAL_PICKS) {
    return NextResponse.json({ error: "draft_incomplete" }, { status: 400 });
  }

  const human = payload.picks.filter((p) => p.side === "human");
  const ai = payload.picks.filter((p) => p.side === "ai");

  const isFriend = payload.mode === "vs-friend" && !!payload.player_names;
  const humanLabel = isFriend ? payload.player_names!.human : "HUMAN";
  const aiLabel = isFriend ? payload.player_names!.ai : "AI";

  const userPrompt = `Team: ${payload.team.city} ${payload.team.name}
${isFriend ? `\nThis is a 2-player friend draft. Side "human" = ${humanLabel}. Side "ai" = ${aiLabel}.\n` : ""}
${humanLabel} ROSTER:
${describeRoster(human)}

${aiLabel} ROSTER:
${describeRoster(ai)}

Judge the matchup. Return JSON only.`;

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system: SYSTEM_PROMPT_BASE,
      prompt: userPrompt,
      maxOutputTokens: 1000,
    });
    const jsonText = extractJson(text);
    if (!jsonText) throw new Error(`no_json: ${text.slice(0, 200)}`);
    const parsed = JSON.parse(jsonText);
    const validated = VerdictSchema.parse(parsed);

    const verdict: DraftJudgement = {
      winner: validated.winner,
      human_grade: validated.human_grade,
      ai_grade: validated.ai_grade,
      human_summary: validated.human_summary,
      ai_summary: validated.ai_summary,
      verdict: validated.verdict,
      ...(validated.series_score ? { series_score: validated.series_score } : {}),
      ...(validated.series_story ? { series_story: validated.series_story } : {}),
    };

    await supa.from("plays").update({ result: verdict }).eq("id", play_id);
    return NextResponse.json({ verdict });
  } catch (err) {
    console.error(
      JSON.stringify({
        scope: "games.draft.judge",
        play_id,
        err: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      })
    );
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}

function describeRoster(picks: DraftPick[]): string {
  return picks.map((p, i) => `${i + 1}. ${p.player_name} (${p.primary_position})`).join("\n");
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
