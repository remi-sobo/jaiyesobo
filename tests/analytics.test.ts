import { describe, expect, it } from "vitest";
import { cleanPath, cleanReferrer, cleanTarget, deviceFor, isBot, rowsFromBatch } from "@/lib/analytics/ingest";
import { clock, dayKey, dayKeys, describe as say, summarize, totals } from "@/lib/analytics/summarize";
import type { SiteEvent } from "@/lib/analytics/types";

const V1 = "11111111-1111-4111-8111-111111111111";
const V2 = "22222222-2222-4222-8222-222222222222";
const S1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const S2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const nobody = { family: false, player_id: null, games_session_id: null };

describe("cleaning what the browser sends", () => {
  it("drops query strings and trailing slashes", () => {
    expect(cleanPath("/column/my-take/?utm=x#top")).toBe("/column/my-take");
    expect(cleanPath("/")).toBe("/");
  });

  it("never records private areas", () => {
    for (const p of ["/admin", "/admin/plan", "/me", "/me/week", "/games-admin/x", "/api/pulse"]) expect(cleanPath(p)).toBeNull();
    expect(cleanPath("/meet")).toBe("/meet");
  });

  it("masks invite codes and share tokens", () => {
    expect(cleanPath("/runitback/l/HOOP-7342")).toBe("/runitback/l/:code");
    expect(cleanPath("/games/share/abc123")).toBe("/games/share/:token");
  });

  it("rejects things that aren't our paths", () => {
    expect(cleanPath("//evil.com")).toBeNull();
    expect(cleanPath("https://evil.com")).toBeNull();
    expect(cleanPath(42)).toBeNull();
  });

  it("keeps only the site name of a referrer, and not our own", () => {
    expect(cleanReferrer("https://www.instagram.com/p/abc?x=1", "jaiyesobo.com")).toBe("instagram.com");
    expect(cleanReferrer("https://www.jaiyesobo.com/pod", "jaiyesobo.com")).toBeNull();
    expect(cleanReferrer("", "jaiyesobo.com")).toBeNull();
  });

  it("strips queries from click targets and hides private ones", () => {
    expect(cleanTarget("youtube.com/watch?v=abc")).toBe("youtube.com/watch");
    expect(cleanTarget("/admin/plan")).toBe("(private)");
    expect(cleanTarget("/runitback/l/DUNK-1111")).toBe("/runitback/l/:code");
  });

  it("sorts screens into phone, tablet, computer", () => {
    expect(deviceFor(390)).toBe("phone");
    expect(deviceFor(820)).toBe("tablet");
    expect(deviceFor(1440)).toBe("computer");
    expect(deviceFor(undefined)).toBeNull();
  });

  it("spots bots", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1")).toBe(false);
  });
});

describe("rowsFromBatch", () => {
  it("builds rows and drops the bad ones", () => {
    const rows = rowsFromBatch(
      {
        v: V1,
        s: S1,
        w: 390,
        e: [
          { t: "pageview", p: "/pod?x=1", r: "https://t.co/abc" },
          { t: "read", p: "/column/a", k: "column:a", l: "  A   title ", n: 250 },
          { t: "pageview", p: "/admin/plan" },
          { t: "nonsense", p: "/" },
          null,
        ],
      },
      nobody,
      "jaiyesobo.com",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ type: "pageview", path: "/pod", referrer: "t.co", device: "phone", visitor_id: V1 });
    expect(rows[1]).toMatchObject({ type: "read", label: "A title", value: 100, referrer: null });
  });

  it("refuses a batch without real ids", () => {
    expect(rowsFromBatch({ v: "me", s: S1, e: [{ t: "pageview", p: "/" }] }, nobody, null)).toEqual([]);
    expect(rowsFromBatch("hello", nobody, null)).toEqual([]);
  });

  it("never ties a name to a browser that asked not to be tracked", () => {
    const who = { family: false, player_id: V2, games_session_id: V2 };
    const [open] = rowsFromBatch({ v: V1, s: S1, e: [{ t: "pageview", p: "/" }] }, who, null);
    const [priv] = rowsFromBatch({ v: V1, s: S1, x: true, e: [{ t: "pageview", p: "/" }] }, who, null);
    expect(open.player_id).toBe(V2);
    expect(priv).toMatchObject({ private: true, player_id: null, games_session_id: null });
  });

  it("caps a batch at 25 events", () => {
    const e = Array.from({ length: 80 }, () => ({ t: "pageview", p: "/" }));
    expect(rowsFromBatch({ v: V1, s: S1, e }, nobody, null)).toHaveLength(25);
  });
});

let nextId = 1;
function ev(at: string, visitor: string, session: string, type: SiteEvent["type"], more: Partial<SiteEvent> = {}): SiteEvent {
  return {
    id: nextId++,
    created_at: at,
    visitor_id: visitor,
    session_id: session,
    type,
    path: "/",
    target: null,
    label: null,
    detail: null,
    value: null,
    referrer: null,
    device: "phone",
    private: false,
    family: false,
    player_id: null,
    games_session_id: null,
    ...more,
  };
}

describe("days", () => {
  it("uses the Pacific calendar day", () => {
    // 06:30 UTC on Nov 10 is still Nov 9 in California.
    expect(dayKey("2026-11-10T06:30:00Z")).toBe("2026-11-09");
    expect(dayKey("2026-11-10T20:00:00Z")).toBe("2026-11-10");
  });

  it("lists days oldest first, and the period before", () => {
    const now = new Date("2026-11-10T20:00:00Z");
    expect(dayKeys(now, 3)).toEqual(["2026-11-08", "2026-11-09", "2026-11-10"]);
    expect(dayKeys(now, 3, 3)).toEqual(["2026-11-05", "2026-11-06", "2026-11-07"]);
  });
});

describe("summarize", () => {
  const days = ["2026-11-09", "2026-11-10"];
  const events = [
    ev("2026-11-09T18:00:00Z", V1, S1, "pageview", { path: "/", referrer: "instagram.com" }),
    ev("2026-11-09T18:00:30Z", V1, S1, "engage", { path: "/", value: 30 }),
    ev("2026-11-09T18:00:31Z", V1, S1, "click", { path: "/", target: "/column/a", label: "Read it", detail: "in" }),
    ev("2026-11-09T18:00:32Z", V1, S1, "pageview", { path: "/column/a" }),
    ev("2026-11-09T18:00:33Z", V1, S1, "read", { path: "/column/a", target: "column:a", label: "A", value: 0 }),
    ev("2026-11-09T18:01:00Z", V1, S1, "read", { path: "/column/a", target: "column:a", label: "A", value: 50 }),
    ev("2026-11-09T18:02:00Z", V1, S1, "read", { path: "/column/a", target: "column:a", label: "A", value: 100 }),
    ev("2026-11-09T18:02:10Z", V1, S1, "engage", { path: "/column/a", value: 90 }),
    ev("2026-11-10T19:00:00Z", V2, S2, "pageview", { path: "/", device: "computer" }),
    ev("2026-11-10T19:00:05Z", V2, S2, "read", { device: "computer", path: "/column/a", target: "column:a", label: "A", value: 0 }),
    ev("2026-11-10T19:00:10Z", V2, S2, "watch", { device: "computer", target: "short:dame", label: "Dame Time", detail: "start" }),
    ev("2026-11-10T19:00:30Z", V2, S2, "watch", { device: "computer", target: "short:dame", label: "Dame Time", detail: "time", value: 20 }),
    ev("2026-11-10T19:00:31Z", V2, S2, "watch", { device: "computer", target: "short:dame", label: "Dame Time", detail: "complete" }),
    ev("2026-11-10T19:00:40Z", V2, S2, "click", { device: "computer", path: "/", target: "/column/a", label: "Read it", detail: "in" }),
  ];
  const s = summarize(events, days);

  it("counts the headline numbers", () => {
    expect(s.totals).toEqual({ visitors: 2, visits: 2, pageviews: 3, avgSeconds: 40 });
    expect(totals([])).toEqual({ visitors: 0, visits: 0, pageviews: 0, avgSeconds: 0 });
  });

  it("splits by day", () => {
    expect(s.daily).toEqual([
      { day: "2026-11-09", visitors: 1, pageviews: 2 },
      { day: "2026-11-10", visitors: 1, pageviews: 1 },
    ]);
  });

  it("ranks pages with time", () => {
    expect(s.pages[0]).toEqual({ path: "/", views: 2, visitors: 2, avgSeconds: 15 });
    expect(s.pages[1]).toEqual({ path: "/column/a", views: 1, visitors: 1, avgSeconds: 90 });
  });

  it("tracks how far each reader got, once per reader", () => {
    expect(s.reads).toEqual([{ key: "column:a", label: "A", opened: 2, half: 1, finished: 1 }]);
  });

  it("adds up watching", () => {
    expect(s.watches).toEqual([{ key: "short:dame", label: "Dame Time", plays: 1, viewers: 1, finishes: 1, seconds: 20 }]);
  });

  it("groups clicks by where they go", () => {
    expect(s.clicks).toEqual([{ target: "/column/a", kind: "in", label: "Read it", clicks: 2, visitors: 2 }]);
  });

  it("credits each visit to where it came from", () => {
    expect(s.sources).toEqual(expect.arrayContaining([{ name: "instagram.com", count: 1 }, { name: "Direct or typed in", count: 1 }]));
    expect(s.devices).toEqual(expect.arrayContaining([{ name: "phone", count: 1 }, { name: "computer", count: 1 }]));
  });

  it("lists people newest first", () => {
    expect(s.people.map((p) => p.visitorId)).toEqual([V2, V1]);
    expect(s.people[1]).toMatchObject({ visits: 1, pageviews: 2, seconds: 120, topPath: "/" });
  });

  it("keeps time-on-page out of the live feed", () => {
    expect(s.recent.some((e) => e.type === "engage")).toBe(false);
    expect(s.recent[0].created_at).toBe("2026-11-10T19:00:40Z");
  });
});

describe("words", () => {
  it("formats durations", () => {
    expect(clock(42)).toBe("42s");
    expect(clock(65)).toBe("1m 05s");
    expect(clock(7800)).toBe("2h 10m");
  });

  it("describes events in plain words", () => {
    expect(say(ev("2026-11-10T19:00:00Z", V1, S1, "read", { target: "column:a", label: "A", value: 100 }))).toBe('Finished reading "A"');
    expect(say(ev("2026-11-10T19:00:00Z", V1, S1, "pageview", { path: "/pod", referrer: "t.co" }))).toBe("Opened /pod (from t.co)");
  });
});
