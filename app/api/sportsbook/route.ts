import { NextResponse } from "next/server";
import { ActionError, savePick, submitPicks } from "@/lib/sportsbook/actions";
import { castVote, getVisitor, isReactionKey, toggleReaction } from "@/lib/sportsbook/fans";
import {
  challengerByCode,
  checkDisplayName,
  clearChallengerCookie,
  createChallenger,
  getChallenger,
  isAgeBand,
  setChallengerCookie,
} from "@/lib/sportsbook/players";
import { joinLeague, leaveLeague } from "@/lib/sportsbook/leagues";
import { overLimit } from "@/lib/sportsbook/limits";
import { deleteTalk, fileReport, isReportContext, postTalk, setMute } from "@/lib/sportsbook/safety";

export const dynamic = "force-dynamic";

type Body = Record<string, unknown>;

/**
 * POST /api/sportsbook { action }
 *   join { name, age_band, league? }   new challenger, sets the cookie, returns their code
 *   restore { code }     same challenger on another device
 *   pick { item_id, choice?, guess?, is_lock? }
 *   submit { week }      lock this challenger's picks for the week
 *   leave                forget this device
 *   react { item_id, player_id, emoji }   toggle an emoji on a revealed pick
 *   vote { week_id, choice }             who wins the week, jaiye or remi
 *   league_join { code, from? }          join a private league
 *   league_leave { league_id }
 *   talk { item_id, key }                preset trash talk line (key null removes it)
 *   report { player_id, context, ref_id? }
 *   mute { player_id, muted }
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    switch (body.action) {
      case "join": {
        const check = checkDisplayName(body.name);
        if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
        if (!isAgeBand(body.age_band)) return NextResponse.json({ error: "Tell us if you're 13 or older." }, { status: 400 });
        if (await overLimit(req, "join")) return NextResponse.json({ error: "Too many new players from here. Try later." }, { status: 429 });
        const { id, code } = await createChallenger(check.name, body.age_band);
        await setChallengerCookie(id);
        // Joining from an invite link drops you straight into that league.
        if (typeof body.league === "string" && body.league) {
          const inviter = typeof body.from === "string" && body.from ? await challengerByCode(body.from) : null;
          await joinLeague(id, body.league, inviter).catch(() => null);
        }
        return NextResponse.json({ ok: true, code });
      }
      case "restore": {
        if (await overLimit(req, "restore")) return NextResponse.json({ error: "Too many tries. Wait a bit." }, { status: 429 });
        const id = await challengerByCode(typeof body.code === "string" ? body.code : "");
        if (!id) return NextResponse.json({ error: "No player with that code." }, { status: 404 });
        await setChallengerCookie(id);
        return NextResponse.json({ ok: true });
      }
      case "pick": {
        const me = await getChallenger();
        if (!me) return NextResponse.json({ error: "Join first." }, { status: 401 });
        if (await overLimit(req, "pick")) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
        await savePick(typeof body.item_id === "string" ? body.item_id : "", me.id, {
          choice: body.choice === null ? null : typeof body.choice === "string" ? body.choice : undefined,
          guess: body.guess === null ? null : typeof body.guess === "number" ? body.guess : undefined,
          is_lock: typeof body.is_lock === "boolean" ? body.is_lock : undefined,
        });
        return NextResponse.json({ ok: true });
      }
      case "submit": {
        const me = await getChallenger();
        if (!me) return NextResponse.json({ error: "Join first." }, { status: 401 });
        const week = typeof body.week === "number" ? body.week : 0;
        if (!week) break;
        await submitPicks(week, me.id);
        return NextResponse.json({ ok: true });
      }
      case "react": {
        if (!isReactionKey(body.emoji)) break;
        if (await overLimit(req, "react")) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
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
      case "league_join": {
        const me = await getChallenger();
        if (!me) return NextResponse.json({ error: "Join first." }, { status: 401 });
        if (await overLimit(req, "league_join")) return NextResponse.json({ error: "Too many tries. Wait a bit." }, { status: 429 });
        const inviter = typeof body.from === "string" && body.from ? await challengerByCode(body.from) : null;
        const league = await joinLeague(me.id, typeof body.code === "string" ? body.code : "", inviter);
        return NextResponse.json({ ok: true, league_id: league.id });
      }
      case "league_leave": {
        const me = await getChallenger();
        if (!me) return NextResponse.json({ error: "Join first." }, { status: 401 });
        await leaveLeague(me.id, typeof body.league_id === "string" ? body.league_id : "");
        return NextResponse.json({ ok: true });
      }
      case "talk": {
        const me = await getChallenger();
        if (!me) return NextResponse.json({ error: "Join first." }, { status: 401 });
        if (await overLimit(req, "talk")) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
        const itemId = typeof body.item_id === "string" ? body.item_id : "";
        if (body.key === null) await deleteTalk(me.id, itemId);
        else await postTalk(me.id, itemId, body.key);
        return NextResponse.json({ ok: true });
      }
      case "report": {
        if (!isReportContext(body.context)) break;
        if (await overLimit(req, "report")) return NextResponse.json({ error: "Too many reports. Wait a bit." }, { status: 429 });
        const me = await getChallenger();
        await fileReport(me?.id ?? null, String(body.player_id ?? ""), body.context, typeof body.ref_id === "string" ? body.ref_id : null);
        return NextResponse.json({ ok: true });
      }
      case "mute": {
        const me = await getChallenger();
        if (!me) return NextResponse.json({ error: "Join first." }, { status: 401 });
        if (await overLimit(req, "mute")) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
        await setMute(me.id, String(body.player_id ?? ""), body.muted !== false);
        return NextResponse.json({ ok: true });
      }
    }
  } catch (e) {
    if (e instanceof ActionError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(JSON.stringify({ scope: "sportsbook.public", action: body.action, err: String(e) }));
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
  return NextResponse.json({ error: "bad_request" }, { status: 400 });
}
