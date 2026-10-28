import { describe, expect, expectTypeOf, it } from "vitest";
import { housePickReactions, REACTIONS, type ReactionKey, type ReactionSlot } from "@/lib/sportsbook/reactions";
import type { ApiHousePick } from "@/lib/app-api/types";

const ITEM = "11111111-1111-4111-8111-111111111111";
const OTHER_ITEM = "22222222-2222-4222-8222-222222222222";
const JAIYE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REMI = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

// Shaped like loadReactions output: keyed `${item_id}:${player_id}`.
const slots: Record<string, ReactionSlot> = {
  [`${ITEM}:${JAIYE}`]: { counts: { fire: 3, laugh: 1 }, mine: ["laugh"] },
  [`${ITEM}:${REMI}`]: { counts: { clown: 2 }, mine: [] },
};

describe("housePickReactions", () => {
  it("gives counts and the viewer's own reaction for a locked pick", () => {
    expect(housePickReactions(slots, ITEM, JAIYE, true)).toEqual({ reactions: { fire: 3, laugh: 1 }, my_reaction: "laugh" });
  });

  it("has no my_reaction when the viewer didn't react to this pick", () => {
    expect(housePickReactions(slots, ITEM, REMI, true)).toEqual({ reactions: { clown: 2 }, my_reaction: null });
  });

  it("keeps each pick's counts apart", () => {
    expect(housePickReactions(slots, ITEM, REMI, true).reactions).not.toHaveProperty("fire");
    expect(housePickReactions(slots, OTHER_ITEM, JAIYE, true)).toEqual({ reactions: {}, my_reaction: null });
  });

  it("reveals nothing before the item locks", () => {
    expect(housePickReactions(slots, ITEM, JAIYE, false)).toEqual({ reactions: {}, my_reaction: null });
  });

  it("is empty for a pick nobody reacted to", () => {
    expect(housePickReactions({}, ITEM, JAIYE, true)).toEqual({ reactions: {}, my_reaction: null });
  });

  it("shows counts but no my_reaction when the viewer gave none (signed out)", () => {
    const signedOut: Record<string, ReactionSlot> = { [`${ITEM}:${JAIYE}`]: { counts: { fire: 3 }, mine: [] } };
    expect(housePickReactions(signedOut, ITEM, JAIYE, true)).toEqual({ reactions: { fire: 3 }, my_reaction: null });
  });

  it("picks one stable reaction when the viewer holds several", () => {
    const both: Record<string, ReactionSlot> = { [`${ITEM}:${JAIYE}`]: { counts: { fire: 1, target: 1 }, mine: ["target", "fire"] } };
    expect(housePickReactions(both, ITEM, JAIYE, true).my_reaction).toBe("fire");
    expect(housePickReactions(both, ITEM, JAIYE, true).my_reaction).toBe("fire");
  });

  it("returns a copy of the counts so callers can't change the loader's map", () => {
    const out = housePickReactions(slots, ITEM, JAIYE, true);
    out.reactions.fire = 99;
    expect(slots[`${ITEM}:${JAIYE}`].counts.fire).toBe(3);
  });
});

describe("app API reaction keys", () => {
  it("match the website's emoji set", () => {
    expectTypeOf<NonNullable<ApiHousePick["my_reaction"]>>().toEqualTypeOf<ReactionKey>();
    expect(REACTIONS.map((r) => r.key)).toEqual(["fire", "laugh", "cold", "clown", "target"]);
  });
});
