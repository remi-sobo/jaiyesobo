import { NextResponse } from "next/server";
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
  updateItem,
} from "@/lib/sportsbook/actions";
import { checkDisplayName, getHousePlayers } from "@/lib/sportsbook/players";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Body = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/**
 * POST /api/admin/sportsbook { action, ... }
 *
 * Every admin move for the Sobo Sportsbook goes through here: drafting the
 * slate, editing it, opening the week, Jaiye's and Remi's picks on the
 * shared screen, hand grading, recaps, finalizing, and challenger moderation.
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
      case "draft":
        if (!week) break;
        return NextResponse.json({ ok: true, count: await draftWeek(week) });
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
