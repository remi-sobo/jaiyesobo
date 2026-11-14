import { describe, expect, it } from "vitest";
import { CLAIM_SUBJECT, canRepend, canSendConfirm, firstSentences, isStaleClaim, isUuid, isValidEmail, maskEmail, normalizeEmail, ordinal, relationFor } from "@/lib/email/rules";

describe("email validation", () => {
  it("accepts ordinary addresses and lowercases them", () => {
    expect(isValidEmail("Remi.Sobo+picks@Gmail.com")).toBe(true);
    expect(normalizeEmail("  Remi@Gmail.COM ")).toBe("remi@gmail.com");
  });

  it("rejects things that aren't addresses", () => {
    for (const bad of ["", "nope", "a@b", "@gmail.com", "a b@gmail.com", "a@@gmail.com", "a@gmail..com", "a@-bad.com", 42, null, undefined, "a@" + "x".repeat(300) + ".com"]) {
      expect(isValidEmail(bad)).toBe(false);
    }
  });
});

describe("under 13 means a parent", () => {
  it("sends under 13 players to a parent", () => {
    expect(relationFor({ ageBand: "under_13" })).toBe("parent");
  });
  it("treats an unknown age on a player (null) as a parent check too", () => {
    expect(relationFor({ ageBand: null })).toBe("parent");
  });
  it("lets 13 and older sign up for themselves", () => {
    expect(relationFor({ ageBand: "13_plus" })).toBe("self");
  });
  it("honors the fan box's parent tick, and no age means self", () => {
    expect(relationFor({ under13: true })).toBe("parent");
    expect(relationFor({})).toBe("self");
    expect(relationFor({ ageBand: "13_plus", under13: true })).toBe("parent");
  });
});

describe("small helpers", () => {
  it("masks an address", () => {
    expect(maskEmail("remi@gmail.com")).toBe("r***@gmail.com");
    expect(maskEmail("nonsense")).toBe("***");
  });
  it("makes ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st", "111th"]);
  });
  it("takes the first sentences", () => {
    expect(firstSentences("I won. Dad lost!  Easy week.", 2)).toBe("I won. Dad lost!");
    expect(firstSentences("One sentence only", 2)).toBe("One sentence only");
    expect(firstSentences(null)).toBe("");
  });
});

const H = 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

describe("canSendConfirm (24 hour cooldown)", () => {
  it("allows the first one", () => {
    expect(canSendConfirm(null, NOW)).toBe(true);
    expect(canSendConfirm(undefined, NOW)).toBe(true);
  });
  it("blocks inside 24 hours and allows at and after it", () => {
    expect(canSendConfirm(NOW - 1000, NOW)).toBe(false);
    expect(canSendConfirm(new Date(NOW - 23 * H), NOW)).toBe(false);
    expect(canSendConfirm(new Date(NOW - 24 * H).toISOString(), NOW)).toBe(true);
    expect(canSendConfirm(NOW - 48 * H, NOW)).toBe(true);
  });
  it("treats an unreadable date as never sent", () => {
    expect(canSendConfirm("nope", NOW)).toBe(true);
  });
});

describe("canRepend (when subscribe may re-pend a row)", () => {
  it("never touches a confirmed row", () => {
    expect(canRepend({ status: "confirmed", unsubscribed_at: null }, NOW)).toBe(false);
  });
  it("refreshes a pending row", () => {
    expect(canRepend({ status: "pending" }, NOW)).toBe(true);
  });
  it("re-pends an unsubscribed row only after 24 hours", () => {
    expect(canRepend({ status: "unsubscribed", unsubscribed_at: new Date(NOW - H).toISOString() }, NOW)).toBe(false);
    expect(canRepend({ status: "unsubscribed", unsubscribed_at: new Date(NOW - 24 * H).toISOString() }, NOW)).toBe(true);
    expect(canRepend({ status: "unsubscribed", unsubscribed_at: null }, NOW)).toBe(true);
  });
  it("ignores unknown statuses", () => {
    expect(canRepend({ status: "weird" }, NOW)).toBe(false);
  });
});

describe("isStaleClaim", () => {
  const claim = (ageMin: number, over: Partial<{ status: string; subject: string | null }> = {}) => ({
    status: "skipped",
    subject: CLAIM_SUBJECT,
    created_at: new Date(NOW - ageMin * 60_000).toISOString(),
    ...over,
  });
  it("only a pre-send claim older than 10 minutes is stale", () => {
    expect(isStaleClaim(claim(11), NOW)).toBe(true);
    expect(isStaleClaim(claim(5), NOW)).toBe(false);
    expect(isStaleClaim(claim(60, { status: "sent" }), NOW)).toBe(false);
    expect(isStaleClaim(claim(60, { subject: "Week 5 results" }), NOW)).toBe(false);
  });
});

describe("isUuid", () => {
  it("accepts uuids and nothing else", () => {
    expect(isUuid("11111111-2222-3333-4444-555555555555")).toBe(true);
    expect(isUuid("ABCDEF12-2222-3333-4444-555555555555")).toBe(true);
    for (const bad of ["test", "", null, undefined, 5, "11111111-2222-3333-4444-55555555555x"]) expect(isUuid(bad)).toBe(false);
  });
});
