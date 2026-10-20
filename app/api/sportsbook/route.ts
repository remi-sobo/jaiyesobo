import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { ipFromRequest } from "@/lib/rate-limit";
import { ActionError, savePick } from "@/lib/sportsbook/actions";
import { castVote, getVisitor, isReactionKey, toggleReaction } from "@/lib/sportsbook/fans";
import {
  checkDisplayName,
  clearChallengerCookie,
  getChallenger,
  newPlayerCode,
  normalizeCode,
  setChallengerCookie,
} from "@/lib/sportsbook/players";

export const dynamic = "force-dynamic";

type Body = Record<string, unknown>;

/** Joins and code restores are capped per IP so nobody floods the leaderboard. */
async function tooMany(req: Request, kind: "join" | "restore"): Promise<boolean> {
  const supa = createServiceClient();
  const identifier = `sportsbook:${kind}:${ipFromRequest(req)}`;
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count } = await supa
    .from("pin_attempts")
    .select("id", { count: "exact", head: true })
    .eq("identifier", identifier)
    .gte("attempted_at", since);
  const limit = kind === "join" ? 5 : 10;
  if ((count ?? 0) >= limit) return true;
  await supa.from("pin_attempts").insert({ identifier, successful: false });
  return false;
}

/**
 * POST /api/sportsbook { action }
 *   join { name }        new challenger, sets the cookie, returns their code
 *   restore { code }     same challenger on another device
 *   pick { item_id, choice?, guess?, is_lock? }
 *   leave                forget this device
 *   react { item_id, player_id, emoji }   toggle an emoji on a revealed pick
 *   vote { week_id, choice }             who wins the week, jaiye or remi
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const supa = createServiceClient();
  try {
    switch (body.action) {
      case "join": {
        const check = checkDisplayName(body.name);
        if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
        if (await tooMany(req, "join")) return NextResponse.json({ error: "Too many new players from here. Try later." }, { status: 429 });
        for (let attempt = 0; attempt < 5; attempt++) {
          const code = newPlayerCode();
          const { data, error } = await supa
            .from("sb_players")
            .insert({ kind: "challenger", display_name: check.name, code })
            .select("id, code")
            .single();
          if (!error && data) {
            await setChallengerCookie(data.id);
            return NextResponse.json({ ok: true, code: data.code });
          }
        }
        return NextResponse.json({ error: "Couldn't sign you up. Try again." }, { status: 500 });
      }
      case "restore": {
        if (await tooMany(req, "restore")) return NextResponse.json({ error: "Too many tries. Wait a bit." }, { status: 429 });
        const code = normalizeCode(typeof body.code === "string" ? body.code : "");
        const { data } = await supa.from("sb_players").select("id").eq("code", code).eq("kind", "challenger").maybeSingle();
        if (!data) return NextResponse.json({ error: "No player with that code." }, { status: 404 });
        await setChallengerCookie(data.id);
        return NextResponse.json({ ok: true });
      }
      case "pick": {
        const me = await getChallenger();
        if (!me) return NextResponse.json({ error: "Join first." }, { status: 401 });
        await savePick(typeof body.item_id === "string" ? body.item_id : "", me.id, {
          choice: body.choice === null ? null : typeof body.choice === "string" ? body.choice : undefined,
          guess: body.guess === null ? null : typeof body.guess === "number" ? body.guess : undefined,
          is_lock: typeof body.is_lock === "boolean" ? body.is_lock : undefined,
        });
        return NextResponse.json({ ok: true });
      }
      case "react": {
        if (!isReactionKey(body.emoji)) break;
        const visitor = (await getVisitor(true))!;
        try {
          await toggleReaction(String(body.item_id ?? ""), String(body.player_id ?? ""), body.emoji, visitor);
        } catch {
          return NextResponse.json({ error: "You can react once picks are revealed." }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
      }
      case "vote": {
        if (body.choice !== "jaiye" && body.choice !== "remi") break;
        const visitor = (await getVisitor(true))!;
        try {
          await castVote(String(body.week_id ?? ""), body.choice, visitor);
        } catch {
          return NextResponse.json({ error: "Voting is closed for this week." }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
      }
      case "leave":
        await clearChallengerCookie();
        return NextResponse.json({ ok: true });
    }
  } catch (e) {
    if (e instanceof ActionError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(JSON.stringify({ scope: "sportsbook.public", action: body.action, err: String(e) }));
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
  return NextResponse.json({ error: "bad_request" }, { status: 400 });
}
