import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BROWSER = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nba.com/",
  Origin: "https://www.nba.com",
};

async function tryJson(url: string, headers: Record<string, string>) {
  try {
    const r = await fetch(url, { headers, cache: "no-store" });
    const text = await r.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: r.status, json, head: text.slice(0, 200) };
  } catch (e) {
    return { status: 0, json: null, head: String(e) };
  }
}

/** Temporary: which NBA data sources answer from Vercel, and what they look like. */
export async function GET() {
  const out: Record<string, unknown> = {};
  const nba = await tryJson("https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json", BROWSER);
  out.nbaScoreboard = { status: nba.status, head: nba.json ? undefined : nba.head };

  const sb = await tryJson("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261020", {});
  out.espnScoreboard = sb.status;
  const j = sb.json as { events?: Array<Record<string, unknown>> } | null;
  const ev = j?.events?.[0];
  out.espnEvents = j?.events?.length ?? 0;
  if (ev) {
    out.espnEventSample = JSON.stringify(ev).slice(0, 2500);
    const sum = await tryJson(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${ev.id}`, {});
    out.espnSummary = sum.status;
    const sj = sum.json as { boxscore?: { players?: Array<Record<string, unknown>> } } | null;
    out.espnBoxSample = JSON.stringify(sj?.boxscore?.players?.[0] ?? null).slice(0, 2500);
  }
  const last = await tryJson("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20260415", {});
  const lj = last.json as { events?: Array<{ id: string }> } | null;
  if (lj?.events?.[0]) {
    const sum = await tryJson(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${lj.events[0].id}`, {});
    const sj = sum.json as { boxscore?: { players?: Array<Record<string, unknown>> } } | null;
    out.espnFinalBox = JSON.stringify(sj?.boxscore?.players?.[0] ?? null).slice(0, 3000);
  }
  return NextResponse.json(out);
}
