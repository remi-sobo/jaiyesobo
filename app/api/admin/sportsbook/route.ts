import { NextResponse } from "next/server";
import { sendWaitingConfirmations } from "@/lib/email/subscribers";
import { requireAdmin } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { isTeamCode } from "@/lib/nba/teams";
import {
  ActionError,
  addProp,
  draftWeek,
  finalizeWeek,
  gradeByHand,
  makeRecap,
  openWeek,
  refresh,
  regenerateItem,
  removeItem,
  saveRecap,
  savePick,
  submitPicks,
  updateItem,
} from "@/lib/sportsbook/actions";
import { approveWeek, unapproveWeek } from "@/lib/sportsbook/autopilot";
import { checkDisplayName, getHousePlayers } from "@/lib/sportsbook/players";
import { archiveLeague, createLeague } from "@/lib/sportsbook/leagues";
import { resolveReports } from "@/lib/sportsbook/safety";
import { sendNewsletter, sendNewsletterTest, type NewsletterKind } from "@/lib/email/campaigns";
import { CONTACT_EMAIL } from "@/lib/sportsbook/contact";
import { SB_SEASON } from "@/lib/sportsbook/weeks";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Body = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/**
 * POST /api/admin/sportsbook { action, ... }
 *
 * Every admin move for Run It Back Picks goes through here: drafting the
 * slate, editing it, approving it (the weekly autopilot opens it Sunday 6pm), opening the week, Jaiye's and Remi's picks on the
 * shared screen, hand grading, recaps, finalizing, challenger moderation,
 * leagues, reports and Season Pass grants for beta testers.
 */
export async function POST(req: Request) {
  await requireAdmin();
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const week = num(body.week);
  try {
    switch (body.action) {
      case "draft": {
        if (!week) break;
        const count = await draftWeek(week);
        // A new slate is a new thing to approve; the Monday fallback still covers it.
        await unapproveWeek(week);
        return NextResponse.json({ ok: true, count });
      }
      case "regenerate":
        await regenerateItem(str(body.item_id));
        return NextResponse.json({ ok: true });
      case "remove":
        await removeItem(str(body.item_id));
        return NextResponse.json({ ok: true });
      case "update_item":
        await updateItem(str(body.item_id), {
          prompt: typeof body.prompt === "string" ? body.prompt : undefined,
          note: typeof body.note === "string" ? body.note : undefined,
          points: num(body.points),
          line: num(body.line),
        });
        return NextResponse.json({ ok: true });
      case "add_prop":
        if (!week) break;
        await addProp(week, {
          prompt: str(body.prompt),
          options: Array.isArray(body.options) ? body.options.map(str) : [],
          points: num(body.points) ?? 2,
          locks_at: str(body.locks_at),
        });
        return NextResponse.json({ ok: true });
      case "open":
        if (!week) break;
        await openWeek(week);
        return NextResponse.json({ ok: true });
      case "approve":
        if (!week) break;
        return NextResponse.json({ ok: true, ...(await approveWeek(week)) });
      case "unapprove":
        if (!week) break;
        await unapproveWeek(week);
        return NextResponse.json({ ok: true });
      case "pick": {
        const who = body.player === "remi" || body.player === "jaiye" ? body.player : null;
        if (!who) break;
        const house = await getHousePlayers();
        await savePick(str(body.item_id), house[who].id, {
          choice: body.choice === null ? null : typeof body.choice === "string" ? body.choice : undefined,
          guess: body.guess === null ? null : num(body.guess),
          is_lock: typeof body.is_lock === "boolean" ? body.is_lock : undefined,
          talk: body.talk === null ? null : typeof body.talk === "string" ? body.talk : undefined,
        });
        return NextResponse.json({ ok: true });
      }
      case "submit": {
        const who = body.player === "remi" || body.player === "jaiye" ? body.player : null;
        if (!who || !week) break;
        const house = await getHousePlayers();
        await submitPicks(week, house[who].id);
        return NextResponse.json({ ok: true });
      }
      case "refresh":
        return NextResponse.json({ ok: true, ...(await refresh()) });
      case "grade":
        await gradeByHand(str(body.item_id), body.winner === null ? null : str(body.winner));
        return NextResponse.json({ ok: true });
      case "recap":
        if (!week) break;
        return NextResponse.json({ ok: true, recap: await makeRecap(week) });
      case "save_recap":
        if (!week) break;
        await saveRecap(week, str(body.recap));
        return NextResponse.json({ ok: true });
      case "finalize":
        if (!week) break;
        await finalizeWeek(week);
        return NextResponse.json({ ok: true });
      case "player": {
        const id = str(body.player_id);
        const patch: Record<string, unknown> = {};
        if (typeof body.hidden === "boolean") patch.hidden = body.hidden;
        if (typeof body.name === "string") {
          const check = checkDisplayName(body.name);
          if (!check.ok) throw new ActionError(check.error);
          patch.display_name = check.name;
        }
        const { error } = await createServiceClient().from("sb_players").update(patch).eq("id", id).eq("kind", "challenger");
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "league_create": {
        // Until the Season Pass ships, leagues are made here. Remi or Jaiye runs it.
        const house = await getHousePlayers();
        const owner = body.as === "jaiye" ? house.jaiye : house.remi;
        const league = await createLeague(owner.id, body.name, { admin: true });
        return NextResponse.json({ ok: true, league_id: league.id, code: league.code });
      }
      case "league_archive":
        await archiveLeague("", str(body.league_id), true);
        return NextResponse.json({ ok: true });
      case "reports_resolve":
        await resolveReports(str(body.player_id), body.unhide === true);
        return NextResponse.json({ ok: true });
      case "pass": {
        // Beta testers: turn the Season Pass on or off by hand.
        const on = body.on === true;
        const { error } = await createServiceClient()
          .from("sb_players")
          .update({ has_pass: on, pass_season: on ? SB_SEASON : null, pass_purchased_at: on ? new Date().toISOString() : null })
          .eq("id", str(body.player_id))
          .eq("kind", "challenger");
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "email_catchup": {
        // Confirm emails for anyone who signed up before RESEND_API_KEY was set.
        return NextResponse.json({ ok: true, ...(await sendWaitingConfirmations()) });
      }
      case "newsletter_test": {
        // One copy to Remi's address. No dedupe log, so it can be sent as often as needed.
        const kind: NewsletterKind = body.kind === "column" ? "column" : "episode";
        const res = await sendNewsletterTest({ kind, slug: str(body.slug), to: CONTACT_EMAIL, note: str(body.note) });
        if (res.status === "error") throw new ActionError(res.error);
        return NextResponse.json({ ok: true, status: res.status });
      }
      case "newsletter_send": {
        const kind: NewsletterKind = body.kind === "column" ? "column" : "episode";
        // Stay inside this route's 120 second limit. Anything left is finished by pressing the button again: nobody gets it twice.
        const res = await sendNewsletter({ kind, slug: str(body.slug), note: str(body.note), budgetMs: 60_000 });
        if (res.errors && !res.sent && !res.already) throw new ActionError("Nothing was sent. Check the server log.");
        return NextResponse.json({ ok: true, ...res });
      }
      case "settings": {
        const fav_teams = (Array.isArray(body.fav_teams) ? body.fav_teams : []).map(str).filter(isTeamCode);
        const fav_players = (Array.isArray(body.fav_players) ? body.fav_players : []).map(str).map((s) => s.trim()).filter(Boolean).slice(0, 12);
        const { error } = await createServiceClient()
          .from("app_config")
          .upsert({ key: "sportsbook_settings", value: { fav_teams, fav_players } }, { onConflict: "key" });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
    }
  } catch (e) {
    if (e instanceof ActionError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(JSON.stringify({ scope: "sportsbook.admin", action: body.action, err: String(e) }));
    return NextResponse.json({ error: e instanceof Error ? e.message : "Something went wrong." }, { status: 500 });
  }
  return NextResponse.json({ error: "bad_request" }, { status: 400 });
}
