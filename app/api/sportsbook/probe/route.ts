import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UA = { "User-Agent": "Mozilla/5.0 (jaiyesobo.com sportsbook)", Accept: "application/json" };

/** Temporary: confirms the NBA public feeds are reachable from Vercel and shows their shape. */
export async function GET() {
  const out: Record<string, unknown> = {};
  try {
    const r = await fetch("https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json", { headers: UA, cache: "no-store" });
    out.scheduleStatus = r.status;
    const j = await r.json();
    const ls = j.leagueSchedule ?? {};
    out.seasonYear = ls.seasonYear;
    const dates = ls.gameDates ?? [];
    out.dates = dates.length;
    const games = dates.flatMap((d: { games: unknown[] }) => d.games ?? []);
    out.games = games.length;
    const finals = games.filter((g: { gameStatus: number }) => g.gameStatus === 3);
    out.finals = finals.length;
    const sample = (finals[finals.length - 1] ?? games[0]) as Record<string, unknown>;
    out.sampleKeys = Object.keys(sample ?? {});
    out.sample = JSON.stringify(sample).slice(0, 1500);
    const gid = (sample as { gameId?: string })?.gameId;
    if (gid) {
      const b = await fetch(`https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gid}.json`, { headers: UA, cache: "no-store" });
      out.boxStatus = b.status;
      if (b.ok) {
        const bj = await b.json();
        const g = bj.game ?? {};
        out.boxGameKeys = Object.keys(g);
        const p = g.homeTeam?.players?.[0];
        out.boxPlayer = JSON.stringify(p).slice(0, 1500);
        out.boxTeamKeys = Object.keys(g.homeTeam ?? {});
      }
    }
    const s = await fetch("https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json", { headers: UA, cache: "no-store" });
    out.scoreboardStatus = s.status;
  } catch (e) {
    out.error = String(e);
  }
  return NextResponse.json(out);
}
