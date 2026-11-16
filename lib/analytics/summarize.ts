import type { Device, SiteEvent } from "./types";

/**
 * Turns raw events into the numbers on /admin/analytics. Pure: no database,
 * no clock unless you pass one in. Days are Pacific time, since that is
 * where the family and most of the readers are.
 */

export const RANGES = [
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
] as const;
export type RangeKey = (typeof RANGES)[number]["key"];

export function rangeFor(key: string | undefined) {
  return RANGES.find((r) => r.key === key) ?? RANGES[1];
}

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" });

/** The Pacific calendar day of a moment, like "2026-11-10". */
export function dayKey(at: string | Date): string {
  return dayFormat.format(typeof at === "string" ? new Date(at) : at);
}

/** `count` day keys ending `endOffset` days before `now`'s day, oldest first. */
export function dayKeys(now: Date, count: number, endOffset = 0): string[] {
  const [y, m, d] = dayKey(now).split("-").map(Number);
  const keys: string[] = [];
  for (let i = count - 1 + endOffset; i >= endOffset; i--) {
    // Noon UTC keeps the date math clear of daylight saving edges.
    keys.push(new Date(Date.UTC(y, m - 1, d - i, 12)).toISOString().slice(0, 10));
  }
  return keys;
}

export function visitorHandle(visitorId: string) {
  return `Visitor ${visitorId.slice(0, 4).toUpperCase()}`;
}

export type Totals = { visitors: number; visits: number; pageviews: number; avgSeconds: number };

export function totals(events: SiteEvent[]): Totals {
  const visitors = new Set<string>();
  const visits = new Set<string>();
  let pageviews = 0;
  let seconds = 0;
  for (const e of events) {
    visitors.add(e.visitor_id);
    visits.add(e.session_id);
    if (e.type === "pageview") pageviews++;
    else if (e.type === "engage") seconds += e.value ?? 0;
  }
  return { visitors: visitors.size, visits: visits.size, pageviews, avgSeconds: pageviews ? Math.round(seconds / pageviews) : 0 };
}

export type DayRow = { day: string; visitors: number; pageviews: number };
export type PageRow = { path: string; views: number; visitors: number; avgSeconds: number };
export type ReadRow = { key: string; label: string; opened: number; half: number; finished: number };
export type WatchRow = { key: string; label: string; plays: number; viewers: number; finishes: number; seconds: number };
export type ClickRow = { target: string; label: string; kind: string; clicks: number; visitors: number };
export type CountRow = { name: string; count: number };
export type PersonRow = {
  visitorId: string;
  firstSeen: string;
  lastSeen: string;
  visits: number;
  pageviews: number;
  seconds: number;
  topPath: string | null;
  device: Device | null;
  family: boolean;
  private: boolean;
  playerId: string | null;
  gamesSessionId: string | null;
};

export type Summary = {
  totals: Totals;
  daily: DayRow[];
  pages: PageRow[];
  reads: ReadRow[];
  watches: WatchRow[];
  clicks: ClickRow[];
  sources: CountRow[];
  devices: CountRow[];
  people: PersonRow[];
  recent: SiteEvent[];
};

function bump<K>(map: Map<K, number>, key: K, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function top<K>(map: Map<K, number>): K | null {
  let best: K | null = null;
  let most = -1;
  for (const [k, n] of map) if (n > most) [best, most] = [k, n];
  return best;
}

/** Everything the dashboard shows, for events already narrowed to the range. `days` are the day keys to chart, oldest first. */
export function summarize(events: SiteEvent[], days: string[]): Summary {
  const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const daily = new Map(days.map((d) => [d, { visitors: new Set<string>(), pageviews: 0 }]));
  const pages = new Map<string, { views: number; visitors: Set<string>; seconds: number }>();
  const reads = new Map<string, { label: string; best: Map<string, number> }>();
  const watches = new Map<string, { label: string; plays: number; viewers: Set<string>; finishes: number; seconds: number }>();
  const clicks = new Map<string, { target: string; kind: string; labels: Map<string, number>; clicks: number; visitors: Set<string> }>();
  const sessionSource = new Map<string, string>();
  const people = new Map<string, PersonRow & { sessions: Set<string>; paths: Map<string, number> }>();

  for (const e of sorted) {
    const day = daily.get(dayKey(e.created_at));
    if (day) {
      day.visitors.add(e.visitor_id);
      if (e.type === "pageview") day.pageviews++;
    }

    let person = people.get(e.visitor_id);
    if (!person) {
      person = {
        visitorId: e.visitor_id,
        firstSeen: e.created_at,
        lastSeen: e.created_at,
        visits: 0,
        pageviews: 0,
        seconds: 0,
        topPath: null,
        device: null,
        family: false,
        private: false,
        playerId: null,
        gamesSessionId: null,
        sessions: new Set(),
        paths: new Map(),
      };
      people.set(e.visitor_id, person);
    }
    person.lastSeen = e.created_at;
    person.sessions.add(e.session_id);
    person.device = e.device ?? person.device;
    person.family ||= e.family;
    person.private ||= e.private;
    person.playerId = e.player_id ?? person.playerId;
    person.gamesSessionId = e.games_session_id ?? person.gamesSessionId;

    if (e.type === "pageview" || e.type === "engage") {
      let page = pages.get(e.path);
      if (!page) pages.set(e.path, (page = { views: 0, visitors: new Set(), seconds: 0 }));
      if (e.type === "pageview") {
        page.views++;
        page.visitors.add(e.visitor_id);
        person.pageviews++;
        bump(person.paths, e.path);
        // A visit's source is wherever its first page view came from.
        if (!sessionSource.has(e.session_id)) sessionSource.set(e.session_id, e.referrer ?? "Direct or typed in");
      } else {
        page.seconds += e.value ?? 0;
        person.seconds += e.value ?? 0;
      }
    } else if (e.type === "read" && e.target) {
      let r = reads.get(e.target);
      if (!r) reads.set(e.target, (r = { label: e.label ?? e.target, best: new Map() }));
      if (e.label) r.label = e.label;
      r.best.set(e.visitor_id, Math.max(r.best.get(e.visitor_id) ?? 0, e.value ?? 0));
    } else if (e.type === "watch" && e.target) {
      let w = watches.get(e.target);
      if (!w) watches.set(e.target, (w = { label: e.label ?? e.target, plays: 0, viewers: new Set(), finishes: 0, seconds: 0 }));
      if (e.label) w.label = e.label;
      w.viewers.add(e.visitor_id);
      if (e.detail === "start") w.plays++;
      else if (e.detail === "complete") w.finishes++;
      else if (e.detail === "time") w.seconds += e.value ?? 0;
    } else if (e.type === "click" && e.target) {
      const kind = e.detail ?? "in";
      const id = `${kind}|${e.target}`;
      let c = clicks.get(id);
      if (!c) clicks.set(id, (c = { target: e.target, kind, labels: new Map(), clicks: 0, visitors: new Set() }));
      c.clicks++;
      c.visitors.add(e.visitor_id);
      if (e.label) bump(c.labels, e.label);
    }
  }

  const sources = new Map<string, number>();
  for (const s of sessionSource.values()) bump(sources, s);
  const devices = new Map<string, number>();
  for (const p of people.values()) bump(devices, p.device ?? "unknown");
  const counts = (m: Map<string, number>): CountRow[] => [...m].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  return {
    totals: totals(sorted),
    daily: days.map((d) => ({ day: d, visitors: daily.get(d)!.visitors.size, pageviews: daily.get(d)!.pageviews })),
    pages: [...pages]
      .filter(([, p]) => p.views > 0)
      .map(([path, p]) => ({ path, views: p.views, visitors: p.visitors.size, avgSeconds: Math.round(p.seconds / p.views) }))
      .sort((a, b) => b.views - a.views),
    reads: [...reads]
      .map(([key, r]) => {
        const best = [...r.best.values()];
        return { key, label: r.label, opened: best.length, half: best.filter((n) => n >= 50).length, finished: best.filter((n) => n >= 100).length };
      })
      .sort((a, b) => b.opened - a.opened),
    watches: [...watches]
      .map(([key, w]) => ({ key, label: w.label, plays: w.plays, viewers: w.viewers.size, finishes: w.finishes, seconds: w.seconds }))
      .sort((a, b) => b.plays - a.plays || b.seconds - a.seconds),
    clicks: [...clicks.values()]
      .map((c) => ({ target: c.target, kind: c.kind, label: top(c.labels) ?? c.target, clicks: c.clicks, visitors: c.visitors.size }))
      .sort((a, b) => b.clicks - a.clicks),
    sources: counts(sources),
    devices: counts(devices),
    people: [...people.values()]
      .map(({ sessions, paths, ...p }) => ({ ...p, visits: sessions.size, topPath: top(paths) }))
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen)),
    recent: sorted.filter((e) => e.type !== "engage").slice(-40).reverse(),
  };
}

/** "1m 05s", "42s", "2h 10m". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`;
}

/** One event as a plain sentence, for the live feed and a visitor's timeline. */
export function describe(e: SiteEvent): string {
  const what = e.label ?? e.target ?? e.path;
  switch (e.type) {
    case "pageview":
      return `Opened ${e.path}${e.referrer ? ` (from ${e.referrer})` : ""}`;
    case "engage":
      return `Spent ${clock(e.value ?? 0)} on ${e.path}`;
    case "click":
      return e.detail === "button" ? `Tapped "${what}"` : `Clicked "${what}" to ${e.detail === "out" ? "" : "go to "}${e.target}`;
    case "read":
      if (!e.value) return `Started reading "${what}"`;
      return e.value >= 100 ? `Finished reading "${what}"` : `Read ${e.value}% of "${what}"`;
    case "watch":
      if (e.detail === "start") return `Started watching "${what}"`;
      if (e.detail === "complete") return `Watched "${what}" to the end`;
      return `Watched ${clock(e.value ?? 0)} of "${what}"`;
  }
}
