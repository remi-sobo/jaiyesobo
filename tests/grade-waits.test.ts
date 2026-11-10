import { describe, expect, it } from "vitest";
import { BOX_GRACE_MS, gradeItem, type GameBox, type GradeContext, type PlayerLine } from "@/lib/sportsbook/grade";
import type { TeamCode } from "@/lib/nba/teams";
import type { ItemSpec } from "@/lib/sportsbook/types";

const H = 3_600_000;
const WEEK_END = Date.parse("2026-11-09T08:00:00Z"); // Sunday midnight Pacific
const LOCK = "2026-11-03T02:00:00Z";

const line = (person_id: number, name: string, team: TeamCode, pts: number, played = true): PlayerLine => ({
  person_id, name, team, played, pts, reb: 0, ast: 0, fg3m: 0, stl: 0, blk: 0,
});

const game = (id: string, home: TeamCode, away: TeamCode, tip: string, players: PlayerLine[] = [], status = 3): GameBox => ({
  game_id: id, status, postponed: false, tip_at: tip, home, away, home_score: 110, away_score: 100, players,
});

function ctx(games: GameBox[], nowMs: number): GradeContext {
  return { games: new Map(games.map((g) => [g.game_id, g])), weekGames: games, weekOver: nowMs >= WEEK_END, now: nowMs, weekEnd: WEEK_END };
}

const leader: ItemSpec = {
  type: "weekly_leader",
  stat: "pts",
  candidates: [
    { person_id: 1, name: "Alpha One", team: "LAL" },
    { person_id: 2, name: "Bravo Two", team: "BOS" },
    { person_id: 3, name: "Charlie Three", team: "DEN" },
  ],
};
const item = (spec: ItemSpec) => ({ spec, options: [], locks_at: LOCK });

describe("weekly_leader waits", () => {
  const lal = game("g1", "LAL", "MIA", "2026-11-04T03:00:00Z", [line(1, "Alpha One", "LAL", 31)]);
  const bos = game("g2", "BOS", "NYK", "2026-11-05T03:00:00Z", [line(2, "Bravo Two", "BOS", 40)]);
  const other = game("g3", "PHX", "UTA", "2026-11-06T03:00:00Z", [], 2); // no candidate plays here, not final

  it("ignores games no candidate played in", () => {
    const out = gradeItem(item(leader), ctx([lal, bos, other], WEEK_END + H));
    expect(out).toMatchObject({ state: "graded", result: { winners: ["1"], actual: 40 } });
  });

  it("waits while a candidate's game is not final, inside the grace period", () => {
    const live = game("g4", "DEN", "SAC", "2026-11-08T03:00:00Z", [], 2);
    expect(gradeItem(item(leader), ctx([lal, bos, live], WEEK_END + H)).state).toBe("pending");
  });

  it("waits while a final candidate game has no player lines, inside the grace period", () => {
    const noLines = game("g4", "DEN", "SAC", "2026-11-08T03:00:00Z", []);
    expect(gradeItem(item(leader), ctx([lal, bos, noLines], WEEK_END + BOX_GRACE_MS - 1)).state).toBe("pending");
  });

  it("grades with the games that have lines once the grace period is over", () => {
    const noLines = game("g4", "DEN", "SAC", "2026-11-08T03:00:00Z", []);
    const out = gradeItem(item(leader), ctx([lal, bos, noLines], WEEK_END + BOX_GRACE_MS));
    expect(out).toMatchObject({ state: "graded", result: { winners: ["1"], actual: 40 } });
  });

  it("voids with No box score available when no candidate game has lines after the grace period", () => {
    const noLines = game("g4", "DEN", "SAC", "2026-11-08T03:00:00Z", []);
    expect(gradeItem(item(leader), ctx([noLines, other], WEEK_END + BOX_GRACE_MS + H))).toEqual({ state: "void", display: "No box score available" });
  });

  it("is pending until the week is over", () => {
    expect(gradeItem(item(leader), ctx([lal, bos], WEEK_END - H)).state).toBe("pending");
  });
});

describe("closest waits", () => {
  const tip = "2026-11-07T03:00:00Z";
  const tipMs = Date.parse(tip);
  const threes: ItemSpec = { type: "closest", game_id: "c1", measure: "total_3s" };

  it("total_3s waits for lines inside 36h of tip-off", () => {
    const g = game("c1", "LAL", "MIA", tip, []);
    expect(gradeItem(item(threes), ctx([g], tipMs + BOX_GRACE_MS - 1)).state).toBe("pending");
  });

  it("total_3s voids with No box score available 36h after tip-off", () => {
    const g = game("c1", "LAL", "MIA", tip, []);
    expect(gradeItem(item(threes), ctx([g], tipMs + BOX_GRACE_MS))).toEqual({ state: "void", display: "No box score available" });
  });

  it("total_3s still waits for a game that is not final, however late", () => {
    const g = game("c1", "LAL", "MIA", tip, [], 2);
    expect(gradeItem(item(threes), ctx([g], tipMs + 5 * BOX_GRACE_MS)).state).toBe("pending");
  });

  it("total_3s grades from lines when they exist", () => {
    const p = { ...line(1, "Alpha One", "LAL", 10), fg3m: 4 };
    const q = { ...line(2, "Bravo Two", "MIA", 10), fg3m: 3 };
    const g = game("c1", "LAL", "MIA", tip, [p, q]);
    expect(gradeItem(item(threes), ctx([g], tipMs + H))).toMatchObject({ state: "graded", result: { actual: 7 } });
  });

  it("total_points and team_points need only the final score", () => {
    const g = game("c1", "LAL", "MIA", tip, []);
    expect(gradeItem(item({ type: "closest", game_id: "c1", measure: "total_points" }), ctx([g], tipMs + H))).toMatchObject({ state: "graded", result: { actual: 210 } });
    expect(gradeItem(item({ type: "closest", game_id: "c1", measure: "team_points", team: "LAL" }), ctx([g], tipMs + H))).toMatchObject({ state: "graded", result: { actual: 110 } });
  });
});

describe("player stat graders (player_ou, h2h, yes_no)", () => {
  const tip = "2026-11-07T03:00:00Z";
  const tipMs = Date.parse(tip);
  const NO_BOX = { state: "void", display: "No box score available" };
  const a = { person_id: 1, name: "Alpha One", team: "LAL" as TeamCode, game_id: "p1" };
  const b = { person_id: 2, name: "Bravo Two", team: "BOS" as TeamCode, game_id: "p2" };
  const specs: Record<string, ItemSpec> = {
    player_ou: { type: "player_ou", player: a, stat: "pts", line: 20.5 },
    yes_no: { type: "yes_no", player: a, check: "double_double" },
    h2h: { type: "h2h", players: [a, b], stat: "pts" },
  };
  const p1 = (lines: PlayerLine[], status = 3) => game("p1", "LAL", "MIA", tip, lines, status);
  const p2 = (lines: PlayerLine[], status = 3) => game("p2", "BOS", "NYK", tip, lines, status);

  for (const name of ["player_ou", "yes_no", "h2h"]) {
    const spec = specs[name];
    const full = [p1([line(1, "Alpha One", "LAL", 25)]), p2([line(2, "Bravo Two", "BOS", 20)])];
    it(`${name}: final game without lines is pending before the grace period`, () => {
      expect(gradeItem(item(spec), ctx([p1([]), p2([line(2, "Bravo Two", "BOS", 20)])], tipMs + BOX_GRACE_MS - 1)).state).toBe("pending");
    });
    it(`${name}: final game without lines voids after the grace period`, () => {
      expect(gradeItem(item(spec), ctx([p1([]), p2([line(2, "Bravo Two", "BOS", 20)])], tipMs + BOX_GRACE_MS))).toEqual(NO_BOX);
    });
    it(`${name}: a game that is not final stays pending however late`, () => {
      expect(gradeItem(item(spec), ctx([p1([], 2), p2([], 2)], tipMs + 5 * BOX_GRACE_MS)).state).toBe("pending");
    });
    it(`${name}: grades normally with lines`, () => {
      expect(gradeItem(item(spec), ctx(full, tipMs + H)).state).toBe("graded");
    });
  }

  it("h2h voids when only one of the two games is missing lines after the grace period", () => {
    const games = [p1([line(1, "Alpha One", "LAL", 25)]), p2([])];
    expect(gradeItem(item(specs.h2h), ctx(games, tipMs + BOX_GRACE_MS))).toEqual(NO_BOX);
    expect(gradeItem(item(specs.h2h), ctx(games, tipMs + H)).state).toBe("pending");
  });
});
