import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function j(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  return { status: r.status, json: r.ok ? await r.json() : null };
}

/** Temporary: ESPN roster and range shapes. */
export async function GET() {
  const out: Record<string, unknown> = {};
  const range = await j("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261019-20261025&limit=200");
  const evs = (range.json?.events ?? []) as Array<{ id: string; date: string; status: unknown; competitions: Array<{ competitors: Array<{ homeAway: string; team: { abbreviation: string } }> }> }>;
  out.rangeStatus = range.status;
  out.rangeEvents = evs.length;
  out.rangeList = evs.map((e) => `${e.id} ${e.date} ${e.competitions[0].competitors.map((c) => c.homeAway + ":" + c.team.abbreviation).join(" ")}`);
  out.statusSample = JSON.stringify(evs[0]?.status ?? null);
  const ros = await j("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/gs/roster");
  out.rosterStatus = ros.status;
  out.rosterKeys = Object.keys(ros.json ?? {});
  out.rosterSample = JSON.stringify((ros.json?.athletes ?? [])[0] ?? null).slice(0, 1500);
  out.rosterCount = (ros.json?.athletes ?? []).length;
  const teams = await j("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams");
  const list = teams.json?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  out.teamAbbrs = list.map((t: { team: { abbreviation: string; id: string } }) => `${t.team.abbreviation}:${t.team.id}`);
  return NextResponse.json(out);
}
