import { describe, expect, it } from "vitest";
import { closestRival, rivalRecord, topRivals, weekTotals } from "@/lib/sportsbook/rivals";
import { rankAt } from "@/lib/app-api/rank";
import type { SbItem, SbPick, SbPlayer, SbWeek } from "@/lib/sportsbook/types";

const week = (n: number, status: SbWeek["status"] = "final"): SbWeek => ({
  id: `w${n}`,
  season: "2026-27",
  week_number: n,
  starts_on: "2026-10-19",
  ends_on: "2026-10-25",
  status,
  recap: null,
  finalized_at: null,
});

const winner = (id: string, weekId: string, win: "a" | "b", points = 1): SbItem => ({
  id,
  week_id: weekId,
  sort: 0,
  type: "winner",
  prompt: "A or B?",
  note: null,
  options: [
    { key: "a", label: "A" },
    { key: "b", label: "B" },
  ],
  points,
  spec: { type: "winner", game_id: "g" },
  locks_at: "2026-10-20T02:00:00Z",
  status: "graded",
  result: { winners: [win], actual: null, display: "" },
});

const pick = (item: string, player: string, choice: string, is_lock = false): SbPick => ({ item_id: item, player_id: player, choice, guess: null, is_lock });

const player = (id: string, kind: SbPlayer["kind"] = "challenger", hidden = false): SbPlayer => ({ id, kind, display_name: id, code: null, hidden });

describe("rivalries", () => {
  // Week 1: me right (+1), dele wrong (-1). Week 2: me wrong, dele right. Week 3: both right (tie). Week 4: me right.
  const weeks = [week(1), week(2), week(3), week(4), week(5, "open")];
  const items = [winner("i1", "w1", "a"), winner("i2", "w2", "a"), winner("i3", "w3", "a"), winner("i4", "w4", "a"), winner("i5", "w5", "a")];
  const picks = [
    pick("i1", "me", "a"),
    pick("i1", "dele", "b"),
    pick("i2", "me", "b"),
    pick("i2", "dele", "a"),
    pick("i3", "me", "a"),
    pick("i3", "dele", "a"),
    pick("i4", "me", "a"),
    pick("i4", "dele", "b"),
    pick("i5", "me", "a"),
    pick("i5", "dele", "b"),
  ];
  const totals = weekTotals(weeks, items, picks);

  it("only counts final weeks", () => {
    expect([...totals.keys()]).toEqual([1, 2, 3, 4]);
  });

  it("counts wins, losses and ties", () => {
    const r = rivalRecord(totals, "me", "dele");
    expect([r.wins, r.losses, r.ties]).toEqual([2, 1, 1]);
    expect(r.weeks.map((w) => w.result)).toEqual(["W", "L", "T", "W"]);
  });

  it("is the mirror image from the other side", () => {
    const r = rivalRecord(totals, "dele", "me");
    expect([r.wins, r.losses, r.ties]).toEqual([1, 2, 1]);
  });

  it("tracks the current streak", () => {
    expect(rivalRecord(totals, "me", "dele").streak).toBe(1);
    expect(rivalRecord(totals, "dele", "me").streak).toBe(-1);
  });

  it("skips weeks one of you didn't play", () => {
    expect(rivalRecord(totals, "me", "nobody").weeks).toEqual([]);
  });

  it("lists Jaiye and Remi first, hides hidden players, then most shared weeks", () => {
    const players = [player("me"), player("dele"), player("ghost", "challenger", true), player("remi", "remi"), player("jaiye", "jaiye")];
    const list = topRivals(totals, "me", players, new Set());
    expect(list.map((r) => r.player.id)).toEqual(["jaiye", "remi", "dele"]);
  });
});

describe("closest rival", () => {
  it("finds the nearest league mate, ahead or behind", () => {
    const live = [
      { player_id: "me", points: 10, correct: 0, wrong: 0, lockHit: null },
      { player_id: "a", points: 14, correct: 0, wrong: 0, lockHit: null },
      { player_id: "b", points: 9, correct: 0, wrong: 0, lockHit: null },
      { player_id: "stranger", points: 10, correct: 0, wrong: 0, lockHit: null },
    ];
    expect(closestRival(live, "me", new Set(["a", "b"]))).toEqual({ player_id: "b", gap: -1 });
    expect(closestRival(live, "me", new Set())).toBeNull();
  });
});

describe("ranks", () => {
  it("shares ranks on ties", () => {
    const pts = [20, 15, 15, 9];
    expect(pts.map((_, i) => rankAt(pts, i))).toEqual([1, 2, 2, 4]);
  });
});
