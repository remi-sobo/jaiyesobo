import { describe, expect, it } from "vitest";
import { reconcileStat, statFromPrompt } from "@/lib/sportsbook/draft";

describe("statFromPrompt", () => {
  it.each([
    ["Who grabs the most rebounds this week?", "reb"],
    ["Who has the most assists in one game?", "ast"],
    ["Who hits the most 3s in a game?", "fg3m"],
    ["Who drains the most threes?", "fg3m"],
    ["Most three-pointers in one game?", "fg3m"],
    ["Who gets the most steals?", "stl"],
    ["Who blocks the most shots?", "blk"],
    ["Who has the biggest scoring night?", "pts"],
    ["Who scores the most points?", "pts"],
    ["Who has the biggest game this week?", null],
    ["Points and rebounds leader?", null],
    ["Most points, rebounds and assists in a game?", "pra"],
    ["Who has the best PRA night?", "pra"],
    ["Points + rebounds + assists for Jokic: over 45.5?", "pra"],
    ["Who gets the most steals and blocks?", "stocks"],
    ["Most stocks in one game?", "stocks"],
    ["Blocks and steals leader this week?", "stocks"],
  ] as const)("%s", (prompt, want) => {
    expect(statFromPrompt(prompt)).toBe(want);
  });
});

describe("reconcileStat", () => {
  it("prompt wins when it names a different stat", () => {
    expect(reconcileStat("Who grabs the most rebounds?", "pts")).toBe("reb");
  });
  it("maps the combo words to pra and stocks", () => {
    expect(reconcileStat("Most points, rebounds and assists?", "pts")).toBe("pra");
    expect(reconcileStat("Most steals and blocks?", "blk")).toBe("stocks");
  });
  it("keeps the AI stat when the prompt names none", () => {
    expect(reconcileStat("Who has the biggest game this week?", "ast")).toBe("ast");
  });
  it("keeps a matching stat and defaults to pts", () => {
    expect(reconcileStat("Most threes?", "fg3m")).toBe("fg3m");
    expect(reconcileStat("Biggest game?", undefined)).toBe("pts");
  });
});
