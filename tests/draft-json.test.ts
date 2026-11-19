import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DraftReply, extractJson } from "@/lib/sportsbook/draft";

describe("extractJson", () => {
  it("reads a bare object", () => {
    expect(extractJson('{"items":[]}')).toEqual({ items: [] });
  });
  it("reads an object inside code fences and prose", () => {
    expect(extractJson('Here you go:\n```json\n{"items":[{"a":1}]}\n```')).toEqual({ items: [{ a: 1 }] });
  });
  it("throws when there is no JSON", () => {
    expect(() => extractJson("sorry, no picks")).toThrow();
  });
});

describe("DraftReply", () => {
  it("converts to JSON Schema for the prompt", () => {
    const shape = JSON.stringify(z.toJSONSchema(DraftReply));
    expect(shape).toContain("upset_picks");
  });
  it("accepts a typical reply and leaves out unused fields", () => {
    const reply = {
      items: [
        { type: "winner", prompt: "Who wins Lakers at Celtics?", note: "Big one", game_id: "401" },
        { type: "player_ou", prompt: "Jokic points over 27.5?", note: "", line: 27.5, stat: "pts", player: { person_id: 1, name: "Nikola Jokic", team: "DEN" } },
      ],
    };
    expect(DraftReply.parse(reply).items).toHaveLength(2);
  });
  it("rejects an unknown type", () => {
    expect(() => DraftReply.parse({ items: [{ type: "parlay", prompt: "x", note: "" }] })).toThrow();
  });
});
