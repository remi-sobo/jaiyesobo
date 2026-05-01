import { NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { createServiceClient } from "@/lib/supabase/server";
import {
  type DraftPick,
  type DraftPlayPayload,
  type DraftPoolPlayer,
  nextTurn,
  roundFor,
  toPoolPlayer,
  TOTAL_PICKS,
} from "@/lib/draft-game";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are an opinionated NBA draft expert helping run a snake draft of one franchise's all-time pool.

You are drafting AGAINST a human opponent. Pick the BEST available player given:
1. What's still on the board
2. Who you've already drafted (your roster)
3. Who they've already drafted (their roster)
4. Roster balance — try to end up with at least one G, one F, and one C across your 5 picks
5. Iconic > role-player when iconic is still available

Be a little spirited in your reasoning. The audience is kids. Keep it clean. One sentence of reasoning, max 18 words.

You MUST respond with ONLY a JSON object. No prose before or after, no markdown fences.

Schema:
{
  "player_name": (must EXACTLY match one name from the AVAILABLE list),
  "reason": (one sentence, ≤18 words, why you took them)
}`;

/**
 * Make Claude's next pick. Server reads the current play state, builds a prompt,
 * gets Claude's pick, validates it's a real available player, commits it.
 */
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

  const payload = play.payload as DraftPlayPayload;
  if (!payload || !Array.isArray(payload.picks)) {
    return NextResponse.json({ error: "play_corrupt" }, { status: 500 });
  }
  if (payload.picks.length >= TOTAL_PICKS) {
    return NextResponse.json({ error: "draft_complete" }, { status: 400 });
  }

  const turn = nextTurn(payload.picks, payload.starts);
  if (turn !== "ai") {
    return NextResponse.json({ error: "not_ai_turn" }, { status: 400 });
  }

  // Build the available pool minus already-drafted
  const { data: rows } = await supa
    .from("game_content")
    .select("id, payload")
    .eq("game_slug", "draft")
    .eq("content_type", "draft_player")
    .eq("draft_team_slug", payload.team_slug)
    .eq("verification_status", "verified")
    .eq("status", "live");
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "pool_empty" }, { status: 500 });
  }

  const taken = new Set(payload.picks.map((p) => p.player_id));
  const pool: DraftPoolPlayer[] = rows
    .map((r) => toPoolPlayer((r as { id: string }).id, (r as { payload: import("@/lib/draft-data").DraftPlayerPayload }).payload))
    .filter((p) => !taken.has(p.id));

  const human = payload.picks.filter((p) => p.side === "human");
  const ai = payload.picks.filter((p) => p.side === "ai");

  const userPrompt = buildPrompt({
    teamCity: payload.team.city,
    teamName: payload.team.name,
    pool,
    aiRoster: ai,
    humanRoster: human,
    pickIndex: payload.picks.length,
  });

  let pickName = "";
  let reason = "";
  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      maxOutputTokens: 600,
    });

    const json = extractJson(text);
    if (!json) throw new Error(`no_json: ${text.slice(0, 120)}`);
    const parsed = JSON.parse(json) as { player_name?: unknown; reason?: unknown };
    if (typeof parsed.player_name !== "string" || typeof parsed.reason !== "string") {
      throw new Error(`bad_shape: ${json.slice(0, 120)}`);
    }
    pickName = parsed.player_name.trim();
    reason = parsed.reason.trim().slice(0, 200);
  } catch (err) {
    console.error(JSON.stringify({ scope: "games.draft.claude-pick", play_id, err: String(err) }));
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }

  // Find Claude's choice in the pool. Match by exact (case-insensitive name);
  // if Claude returned an alias-ish name, fall back to alias match. Last
  // resort: pick the first available iconic player.
  const lc = pickName.toLowerCase();
  let chosen: DraftPoolPlayer | undefined = pool.find((p) => p.name.toLowerCase() === lc);
  if (!chosen) {
    chosen = pool.find((p) => p.search_aliases.some((a) => a.toLowerCase() === lc));
  }
  if (!chosen) {
    // Fallback: first iconic, then first remaining
    chosen = pool.find((p) => p.team_stint.is_iconic) ?? pool[0];
    reason = reason
      ? `${reason} (auto-corrected from "${pickName}")`
      : `Best available — ${chosen.name}.`;
  }

  const pickIndex = payload.picks.length;
  const pick: DraftPick = {
    side: "ai",
    player_id: chosen.id,
    player_name: chosen.name,
    primary_position: chosen.primary_position,
    reason: reason || "Best available.",
    round: roundFor(pickIndex),
    pick_number: pickIndex + 1,
  };

  const updated: DraftPlayPayload = {
    ...payload,
    picks: [...payload.picks, pick],
  };

  const { error: updErr } = await supa.from("plays").update({ payload: updated }).eq("id", play_id);
  if (updErr) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ pick, picks: updated.picks });
}

function buildPrompt(args: {
  teamCity: string;
  teamName: string;
  pool: DraftPoolPlayer[];
  aiRoster: DraftPick[];
  humanRoster: DraftPick[];
  pickIndex: number;
}): string {
  const { teamCity, teamName, pool, aiRoster, humanRoster, pickIndex } = args;
  const round = roundFor(pickIndex);

  // Trim the pool list for prompt size — send name + position + iconic flag + peak
  const poolSummary = pool
    .map((p) => {
      const tag = p.team_stint.is_iconic ? " ★" : "";
      return `- ${p.name}${tag} (${p.primary_position}) — ${p.team_stint.peak_label}`;
    })
    .join("\n");

  const yourRoster = aiRoster.length === 0 ? "(empty)" : aiRoster.map((p) => `${p.player_name} (${p.primary_position})`).join(", ");
  const oppRoster = humanRoster.length === 0 ? "(empty)" : humanRoster.map((p) => `${p.player_name} (${p.primary_position})`).join(", ");

  return `Team: ${teamCity} ${teamName} all-time draft pool.

Round: ${round} of 5
Pick number: ${pickIndex + 1} of 10

YOUR ROSTER so far: ${yourRoster}
OPPONENT'S ROSTER so far: ${oppRoster}

AVAILABLE players (★ = iconic):
${poolSummary}

Pick the best available player for your roster. Return JSON only.`;
}

/** Extract first balanced { … } JSON object from text; tolerates fences/prose. */
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
