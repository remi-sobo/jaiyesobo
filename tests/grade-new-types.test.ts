import { describe, expect, it } from "vitest";
import { BOX_GRACE_MS, gradeItem, type GameBox, type GradeContext, type PlayerLine } from "@/lib/sportsbook/grade";
import type { TeamCode } from "@/lib/nba/teams";
import type { ItemSpec } from "@/lib/sportsbook/types";

const H = 3_600_000;
const WEEK_END = Date.parse("2026-11-09T08:00:00Z");
const LOCK = "2026-11-03T02:00:00Z";
const NOW = Date.parse("2026-11-08T12:00:00Z");

const pl = (person_id: number, name: string, team: TeamCode, s: Partial<PlayerLine> = {}): PlayerLine => ({
  person_id, name, team, played: true, pts: 0, reb: 0, ast: 0, fg3m: 0, stl: 0, blk: 0, ...s,
});

const game = (
  id: string, home: TeamCode, away: TeamCode, hs: number | null, as: number | null,
  o: { status?: number; postponed?: boolean; players?: PlayerLine[]; tip?: string } = {},
): GameBox => ({
  game_id: id, status: o.status ?? 3, postponed: o.postponed ?? false, tip_at: o.tip ?? "2026-11-04T03:00:00Z",
  home, away, home_score: hs, away_score: as, players: o.players ?? [],
});

function ctx(games: GameBox[], now = NOW): GradeContext {
  return { games: new Map(games.map((g) => [g.game_id, g])), weekGames: games, weekOver: now >= WEEK_END, now, weekEnd: WEEK_END };
}
const item = (spec: ItemSpec) => ({ spec, options: [], locks_at: LOCK });

describe("blowout", () => {
  const spec: ItemSpec = {
    type: "blowout",
    games: [
      { game_id: "a", home: "SAS", away: "POR" },
      { game_id: "b", home: "BOS", away: "NYK" },
      { game_id: "c", home: "LAL", away: "MIA" },
    ],
  };
  it("is pending until every listed game is final", () => {
    const g = [game("a", "SAS", "POR", 120, 99), game("b", "BOS", "NYK", 100, 90), game("c", "LAL", "MIA", 50, 40, { status: 2 })];
    expect(gradeItem(item(spec), ctx(g)).state).toBe("pending");
  });
  it("is pending when a game is missing", () => {
    expect(gradeItem(item(spec), ctx([game("a", "SAS", "POR", 120, 99)])).state).toBe("pending");
  });
  it("picks the biggest margin", () => {
    const g = [game("a", "SAS", "POR", 120, 99), game("b", "BOS", "NYK", 100, 90), game("c", "LAL", "MIA", 95, 105)];
    expect(gradeItem(item(spec), ctx(g))).toEqual({
      state: "graded",
      result: { winners: ["a"], actual: 21, display: "Spurs by 21." },
    });
  });
  it("shares a tie", () => {
    const g = [game("a", "SAS", "POR", 120, 100), game("b", "BOS", "NYK", 100, 90), game("c", "LAL", "MIA", 90, 110)];
    const out = gradeItem(item(spec), ctx(g));
    expect(out).toMatchObject({ state: "graded", result: { winners: ["a", "c"], actual: 20 } });
  });
  it("drops a postponed game", () => {
    const g = [game("a", "SAS", "POR", null, null, { postponed: true, status: 1 }), game("b", "BOS", "NYK", 100, 90), game("c", "LAL", "MIA", 95, 108)];
    expect(gradeItem(item(spec), ctx(g))).toMatchObject({ state: "graded", result: { winners: ["c"], actual: 13 } });
  });
  it("voids with fewer than 2 games left", () => {
    const g = [
      game("a", "SAS", "POR", null, null, { postponed: true, status: 1 }),
      game("b", "BOS", "NYK", null, null, { postponed: true, status: 1 }),
      game("c", "LAL", "MIA", 95, 105),
    ];
    expect(gradeItem(item(spec), ctx(g))).toEqual({ state: "void", display: "Not enough games played" });
  });
});

describe("nail_biter", () => {
  const spec: ItemSpec = { type: "nail_biter", game_ids: ["a", "b", "c"], within: 3 };
  it("says yes as soon as one final game is close, even with others unplayed", () => {
    const g = [game("a", "BOS", "NYK", 101, 99), game("b", "LAL", "MIA", 0, 0, { status: 1 }), game("c", "SAS", "POR", null, null, { status: 1 })];
    expect(gradeItem(item(spec), ctx(g))).toEqual({
      state: "graded",
      result: { winners: ["yes"], actual: 2, display: "Closest: Celtics by 2." },
    });
  });
  it("counts exactly the margin", () => {
    const g = [game("a", "BOS", "NYK", 100, 103), game("b", "LAL", "MIA", 90, 100), game("c", "SAS", "POR", 100, 90)];
    expect(gradeItem(item(spec), ctx(g))).toMatchObject({ state: "graded", result: { winners: ["yes"], display: "Closest: Knicks by 3." } });
  });
  it("is pending while nothing is close and a game is unfinished", () => {
    const g = [game("a", "BOS", "NYK", 100, 110), game("b", "LAL", "MIA", 90, 100), game("c", "SAS", "POR", 0, 0, { status: 2 })];
    expect(gradeItem(item(spec), ctx(g)).state).toBe("pending");
  });
  it("says no once all are final and none were close", () => {
    const g = [game("a", "BOS", "NYK", 100, 110), game("b", "LAL", "MIA", 90, 97), game("c", "SAS", "POR", 100, 90)];
    expect(gradeItem(item(spec), ctx(g))).toEqual({
      state: "graded",
      result: { winners: ["no"], actual: 7, display: "Closest finish was 7 points." },
    });
  });
  it("ignores postponed games when deciding no", () => {
    const g = [game("a", "BOS", "NYK", 100, 110), game("b", "LAL", "MIA", null, null, { postponed: true, status: 1 }), game("c", "SAS", "POR", 100, 90)];
    expect(gradeItem(item(spec), ctx(g))).toMatchObject({ state: "graded", result: { winners: ["no"], actual: 10 } });
  });
  it("voids when every game is postponed", () => {
    const g = ["a", "b", "c"].map((id) => game(id, "BOS", "NYK", null, null, { postponed: true, status: 1 }));
    expect(gradeItem(item(spec), ctx(g)).state).toBe("void");
  });
  it("honors a wider margin", () => {
    const g = [game("a", "BOS", "NYK", 100, 105), game("b", "LAL", "MIA", 90, 100), game("c", "SAS", "POR", 100, 90)];
    expect(gradeItem(item({ ...spec, within: 5 } as ItemSpec), ctx(g))).toMatchObject({ result: { winners: ["yes"] } });
  });
});

describe("stat_count", () => {
  const joker = { person_id: 7, name: "Nikola Jokic", team: "DEN" as TeamCode };
  const dd = pl(7, "Nikola Jokic", "DEN", { pts: 25, reb: 12 });
  const quiet = pl(7, "Nikola Jokic", "DEN", { pts: 18, reb: 6, ast: 5 });
  const spec: ItemSpec = {
    type: "stat_count", player: joker, game_ids: ["a", "b", "c"], check: "double_double", buckets: [[0, 1], [2, 2], [3, 3]],
  };
  const g = (id: string, line: PlayerLine | null, o: { status?: number; postponed?: boolean } = {}) =>
    game(id, "DEN", "SAC", 110, 100, { ...o, players: line ? [line] : [] });

  it("counts double-doubles across final games", () => {
    const out = gradeItem(item(spec), ctx([g("a", dd), g("b", quiet), g("c", dd)]));
    expect(out).toEqual({ state: "graded", result: { winners: ["1"], actual: 2, display: "Jokic: 2 double-doubles this week." } });
  });
  it("waits while a game is not final", () => {
    expect(gradeItem(item(spec), ctx([g("a", dd), g("b", quiet), g("c", null, { status: 1 })])).state).toBe("pending");
  });
  it("grades early when the count is past the top bucket", () => {
    const small: ItemSpec = { ...(spec as Extract<ItemSpec, { type: "stat_count" }>), buckets: [[0, 0], [1, 1]] };
    const out = gradeItem(item(small), ctx([g("a", dd), g("b", dd), g("c", null, { status: 1 })]));
    expect(out).toMatchObject({ state: "graded", result: { winners: ["1"], actual: 2 } });
  });
  it("drops postponed games", () => {
    const out = gradeItem(item(spec), ctx([g("a", dd), g("b", dd), g("c", null, { postponed: true, status: 1 })]));
    expect(out).toMatchObject({ state: "graded", result: { winners: ["1"], actual: 2 } });
  });
  it("counts a final game with no lines as 0 after the grace period, waits before", () => {
    const games = [g("a", dd), g("b", dd), g("c", null)];
    const tip = Date.parse(games[2].tip_at);
    expect(gradeItem(item(spec), ctx(games, tip + BOX_GRACE_MS - 1)).state).toBe("pending");
    expect(gradeItem(item(spec), ctx(games, tip + BOX_GRACE_MS))).toMatchObject({ state: "graded", result: { winners: ["1"], actual: 2 } });
  });
  it("does not count a game he missed", () => {
    const out = gradeItem(item(spec), ctx([g("a", dd), g("b", pl(7, "Nikola Jokic", "DEN", { played: false })), g("c", quiet)]));
    expect(out).toMatchObject({ state: "graded", result: { winners: ["0"], actual: 1 } });
  });
  it("supports at_least with a combo stat", () => {
    const s: ItemSpec = { ...(spec as Extract<ItemSpec, { type: "stat_count" }>), check: "at_least", stat: "pra", threshold: 45 };
    const big = pl(7, "Nikola Jokic", "DEN", { pts: 25, reb: 12, ast: 10 });
    const out = gradeItem(item(s), ctx([g("a", big), g("b", dd), g("c", quiet)]));
    expect(out).toMatchObject({ state: "graded", result: { winners: ["0"], actual: 1 } });
  });
});

describe("stat combos", () => {
  const a = pl(1, "Alpha One", "LAL", { pts: 20, reb: 8, ast: 7, stl: 1, blk: 0 });
  const b = pl(2, "Bravo Two", "BOS", { pts: 12, reb: 4, ast: 3, stl: 3, blk: 2 });
  const gm = game("g1", "LAL", "BOS", 110, 100, { players: [a, b] });
  const ref = (p: PlayerLine) => ({ person_id: p.person_id, name: p.name, team: p.team, game_id: "g1" });

  it("player_ou reads pra", () => {
    const out = gradeItem(item({ type: "player_ou", player: ref(a), stat: "pra", line: 34.5 }), ctx([gm]));
    expect(out).toMatchObject({ state: "graded", result: { winners: ["over"], actual: 35 } });
  });
  it("player_ou reads stocks", () => {
    const out = gradeItem(item({ type: "player_ou", player: ref(b), stat: "stocks", line: 5.5 }), ctx([gm]));
    expect(out).toMatchObject({ state: "graded", result: { winners: ["under"], actual: 5 } });
  });
  it("h2h reads pra", () => {
    const out = gradeItem(item({ type: "h2h", players: [ref(a), ref(b)], stat: "pra" }), ctx([gm]));
    expect(out).toMatchObject({ state: "graded", result: { winners: ["a"] } });
  });
  it("weekly_leader reads stocks and pra", () => {
    const cands = [
      { person_id: 1, name: "Alpha One", team: "LAL" as TeamCode },
      { person_id: 2, name: "Bravo Two", team: "BOS" as TeamCode },
    ];
    const c = ctx([gm], WEEK_END + H);
    expect(gradeItem(item({ type: "weekly_leader", stat: "stocks", candidates: cands }), c)).toMatchObject({ state: "graded", result: { winners: ["1"], actual: 5 } });
    expect(gradeItem(item({ type: "weekly_leader", stat: "pra", candidates: cands }), c)).toMatchObject({ state: "graded", result: { winners: ["0"], actual: 35 } });
  });
});
