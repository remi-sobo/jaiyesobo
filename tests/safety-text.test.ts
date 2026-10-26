import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sportsbook/actions", () => ({ ActionError: class ActionError extends Error {} }));

import { checkLeagueName, normalizeLeagueCode, newLeagueCode } from "@/lib/sportsbook/leagues";
import { checkDisplayName, isClean } from "@/lib/sportsbook/players";
import { TALK_KEYS, isTalkKey, talkText } from "@/lib/sportsbook/talk";
import { bearerToken, hashToken, newToken } from "@/lib/sportsbook/sessions";

describe("names", () => {
  it("blocks bad words even with number swaps", () => {
    expect(isClean("Sh1t Show")).toBe(false);
    expect(isClean("Sexton Fans")).toBe(true);
  });
  it("keeps the house names for Jaiye and Remi", () => {
    expect(checkDisplayName("Remi").ok).toBe(false);
    expect(checkDisplayName("Uncle Dele").ok).toBe(true);
  });
  it("checks league names", () => {
    expect(checkLeagueName("Sobo Family")).toEqual({ ok: true, name: "Sobo Family" });
    expect(checkLeagueName("ab").ok).toBe(false);
    expect(checkLeagueName("Beat Jaiye & Remi").ok).toBe(false);
    expect(checkLeagueName("x".repeat(31)).ok).toBe(false);
  });
  it("normalizes league codes", () => {
    expect(normalizeLeagueCode(" crew 1234 ")).toBe("CREW-1234");
    expect(newLeagueCode()).toMatch(/^[A-Z]+-\d{4}$/);
  });
});

describe("trash talk", () => {
  it("has 16 preset lines, no betting words", () => {
    expect(TALK_KEYS).toHaveLength(16);
    for (const k of TALK_KEYS) expect(talkText(k)).not.toMatch(/\b(bet|odds|wager|pays?|payout|cash|parlay)\b/i);
  });
  it("only accepts known keys", () => {
    expect(isTalkKey("ice_cold")).toBe(true);
    expect(isTalkKey("anything you want")).toBe(false);
    expect(talkText("nope")).toBeNull();
  });
});

describe("app tokens", () => {
  it("parses only well formed bearer tokens", () => {
    const t = newToken();
    expect(t).toHaveLength(43);
    expect(bearerToken(new Request("https://x", { headers: { authorization: `Bearer ${t}` } }))).toBe(t);
    expect(bearerToken(new Request("https://x", { headers: { authorization: "Bearer short" } }))).toBeNull();
    expect(bearerToken(new Request("https://x"))).toBeNull();
  });
  it("stores a hash, never the token", () => {
    const t = newToken();
    expect(hashToken(t)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(t)).not.toContain(t);
  });
});
