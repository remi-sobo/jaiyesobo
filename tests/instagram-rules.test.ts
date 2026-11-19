import { beforeAll, describe, expect, it } from "vitest";
import { cleanCustom, cleanOption, emojiCount, pacificNow, preFlag } from "@/lib/instagram/rules";
import { createPickerToken, verifyPickerToken, PICKER_TTL_MS } from "@/lib/instagram/tokens";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret";
});

describe("flagging before the model", () => {
  it("flags crude usernames even when the comment is fine", () => {
    expect(preFlag("kanyehaserectiledysfunction", "U trippin").flagged).toBe(true);
  });
  it("flags contact and location asks", () => {
    expect(preFlag("a", "dm me bro").flagged).toBe(true);
    expect(preFlag("a", "what school do you go to").flagged).toBe(true);
    expect(preFlag("a", "add my snap").flagged).toBe(true);
    expect(preFlag("a", "how old are u").flagged).toBe(true);
  });
  it("flags links and spam", () => {
    expect(preFlag("a", "check out www.example.com").flagged).toBe(true);
  });
  it("lets normal basketball talk through", () => {
    expect(preFlag("sxiangl", "Melo did foul on the inbound tho").flagged).toBe(false);
    expect(preFlag("flicked_upbytee", "wolves won oh well kid").flagged).toBe(false);
  });
});

describe("cleaning model options", () => {
  it("counts emoji as graphemes", () => {
    expect(emojiCount("yeah 😂")).toBe(1);
    expect(emojiCount("👍🏾")).toBe(1);
    expect(emojiCount("no emoji")).toBe(0);
  });
  it("drops options with more than one emoji", () => {
    expect(cleanOption("lol 😂😂")).toBeNull();
  });
  it("removes dashes, hashtags, quotes and a leading mention", () => {
    expect(cleanOption('"@sxiangl ok fine — you win #nba"')).toBe("ok fine, you win");
  });
  it("drops options that are too long", () => {
    expect(cleanOption("a".repeat(221))).toBeNull();
  });
  it("keeps a parent's own words, trimmed", () => {
    expect(cleanCustom("  @x good point 😂😂  ")).toBe("good point 😂😂");
    expect(cleanCustom("   ")).toBeNull();
  });
});

describe("the Pacific clock", () => {
  it("is 6am at 14:00 UTC in winter and 13:00 UTC in summer", () => {
    expect(pacificNow(new Date("2026-11-20T14:00:00Z"))).toEqual({ date: "2026-11-20", hour: 6 });
    expect(pacificNow(new Date("2026-07-20T13:00:00Z"))).toEqual({ date: "2026-07-20", hour: 6 });
    expect(pacificNow(new Date("2026-11-20T13:00:00Z")).hour).toBe(5);
  });
});

describe("picker links", () => {
  it("round-trips the batch id", () => {
    const t = createPickerToken("batch-1");
    expect(verifyPickerToken(t)).toEqual({ batchId: "batch-1" });
  });
  it("expires after 72 hours", () => {
    const t = createPickerToken("batch-1", 0);
    expect(verifyPickerToken(t, PICKER_TTL_MS + 1)).toBeNull();
  });
  it("rejects a tampered token", () => {
    const t = createPickerToken("batch-1");
    const [body, sig] = t.split(".");
    const other = Buffer.from(JSON.stringify({ b: "batch-2", exp: Date.now() + 1000 })).toString("base64url");
    expect(verifyPickerToken(`${other}.${sig}`)).toBeNull();
    expect(verifyPickerToken(`${body}.x${sig}`)).toBeNull();
    expect(verifyPickerToken(null)).toBeNull();
  });
});
