import { describe, expect, it } from "vitest";
import { buildPodPrep, pacificLockLabel, type WeekViewLike } from "@/lib/sportsbook/pod";
import { scoreWeek } from "@/lib/sportsbook/grade";
import type { SbItem, SbPick, SbPlayer } from "@/lib/sportsbook/types";

const J = { id: "j", kind: "jaiye", display_name: "Jaiye", hidden: false } as SbPlayer;
const R = { id: "r", kind: "remi", display_name: "Remi", hidden: false } as SbPlayer;
const C = { id: "c", kind: "challenger", display_name: "Maya", hidden: false } as SbPlayer;
const players = [J, R, C];
const house = { jaiye: J, remi: R };

function item(id: string, sort: number, status: SbItem["status"], winner: string | null, extra: Partial<SbItem> = {}): SbItem {
  return {
    id,
    week_id: "w",
    sort,
    type: "winner",
    prompt: `Who wins game ${sort}?`,
    note: null,
    options: [
      { key: "a", label: "Blazers" },
      { key: "b", label: "Kings" },
    ],
    points: 2,
    spec: { type: "custom" },
    locks_at: "2026-10-21T23:00:00Z", // Wed 4:00pm Pacific
    status,
    result: winner ? { winners: [winner], actual: null, display: "Final: POR 112, SAC 108" } : null,
    ...extra,
  } as SbItem;
}
const pick = (item_id: string, player_id: string, choice: string, is_lock = false): SbPick => ({ item_id, player_id, choice, guess: null, is_lock });

function view(n: number, items: SbItem[], picks: SbPick[], recap: string | null = null): WeekViewLike {
  const scores = scoreWeek(items, picks, players.map((p) => p.id));
  const board = players
    .map((player, i) => ({ player, score: scores[i] }))
    .sort((a, b) => b.score.points - a.score.points);
  return { week: { week_number: n, starts_on: "2026-10-26", ends_on: "2026-11-01", recap }, items, picks, players, board };
}

// Last week: item 0 graded hit (Jaiye Lock), item 1 graded miss, item 2 still open.
const lastItems = [item("l0", 0, "graded", "a"), item("l1", 1, "graded", "b"), item("l2", 2, "open", null, { result: null })];
const lastPicks = [
  pick("l0", "j", "a", true), pick("l1", "j", "a"), pick("l2", "j", "a"),
  pick("l0", "r", "b"), pick("l1", "r", "b", true), pick("l2", "r", "b"),
  pick("l0", "c", "a"), pick("l1", "c", "b"), pick("l2", "c", "a"),
];
const lastWeek = view(1, lastItems, lastPicks, "Jaiye ran away with it. Dad slipped late.");
const thisItems = [item("t0", 0, "open", null, { result: null }), item("t1", 1, "open", null, { result: null }), item("t2", 2, "open", null, { result: null })];
const thisPicks = [pick("t0", "j", "a", true), pick("t1", "j", "a"), pick("t0", "r", "a"), pick("t1", "r", "b")];
const thisWeek = view(2, thisItems, thisPicks);

describe("buildPodPrep", () => {
  const sections = buildPodPrep({ week: 2, thisWeek, lastWeek, house });
  const prompts = sections.flatMap((s) => s.prompts);
  const text = (key: string) => prompts.find((p) => p.key === key)?.text ?? "";

  it("returns six sections in order with stable keys", () => {
    expect(sections.map((s) => s.title)).toEqual([
      "Last week's scoreboard",
      "Last week, pick by pick",
      "Around the league",
      "This week's picks",
      "The segments",
      "Sign-off",
    ]);
    const keys = prompts.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of ["last.score.1", "last.score.4", "last.pick.0", "last.pick.2", "last.open", "league.9", "this.pick.0", "this.pick.2", "this.unsure", "this.prediction", "seg.buy", "seg.vault", "signoff.3"]) {
      expect(keys).toContain(k);
    }
  });

  it("names the winner and Jaiye's gap in the scoreboard lead", () => {
    const lead = sections[0].lead;
    const win = lastWeek.board[0];
    expect(lead).toContain("won Week 1 with");
    expect(lead).toContain("people played");
    expect(lead).toMatch(/Dad finished at -?\d+/);
    if (win.player.id !== "j") expect(lead).toMatch(/Jaiye finished \d\w\w with -?\d+, \d+ back/);
  });

  it("marks the Lock and says open picks are still being graded", () => {
    const table = sections[1].table!;
    expect(table.rows[0][2]).toBe("Blazers (Lock)");
    expect(table.rows[2][4]).toBe("Still being graded");
    expect(table.rows[2][5]).toBe("open");
    expect(text("last.pick.0")).toContain("It hit for +4");
    expect(text("last.pick.1")).toContain("It missed for −2");
    expect(text("last.pick.2")).toContain("Still open");
    expect(text("last.score.4")).toContain('"Jaiye ran away with it."');
  });

  it("builds this week's table, lock label and agree/disagree prompts", () => {
    const t = sections[3];
    expect(t.table!.rows[0]).toEqual(["1", "Who wins game 0?", "2", "Wed 4:00pm", "Blazers (Lock)", "Blazers"]);
    expect(t.lead).toContain("Both have picked.");
    expect(text("this.pick.0")).toContain("You agree.");
    expect(text("this.pick.0")).toContain("This is your Lock: 2 points, doubled either way.");
    expect(text("this.pick.1")).toContain("Make your case");
  });

  it("with no last week, says so and has no last-week pick prompts", () => {
    const s = buildPodPrep({ week: 2, thisWeek, lastWeek: null, house });
    expect(s).toHaveLength(6);
    expect(s[0].lead).toContain("no Week 1 scoreboard");
    expect(s[1].lead).toContain("Week 1 is not in the system");
    expect(s[0].prompts).toHaveLength(0);
    expect(s[1].prompts).toHaveLength(0);
    expect(s.flatMap((x) => x.prompts).some((p) => p.key.startsWith("last."))).toBe(false);
  });
});

describe("pacificLockLabel", () => {
  it("formats in Pacific time", () => {
    expect(pacificLockLabel("2026-10-21T23:00:00Z")).toBe("Wed 4:00pm");
  });
});
