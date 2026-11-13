import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sign, verify, verifyForDb, versionMatches } from "@/lib/email/tokens";

const OLD = process.env.SESSION_SECRET;
beforeEach(() => {
  process.env.SESSION_SECRET = "test-secret-for-email-tokens";
});
afterEach(() => {
  process.env.SESSION_SECRET = OLD;
});

describe("email tokens", () => {
  it("round trips a confirm token", () => {
    const t = sign({ sid: "abc", purpose: "confirm" });
    expect(verify(t, "confirm")).toMatchObject({ sid: "abc", purpose: "confirm" });
  });

  it("is URL safe", () => {
    const t = sign({ sid: "11111111-2222-3333-4444-555555555555", purpose: "manage" });
    expect(t).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("confirm tokens expire after 7 days, manage tokens never do", () => {
    const now = 1_700_000_000_000;
    const confirm = sign({ sid: "a", purpose: "confirm" }, now);
    const manage = sign({ sid: "a", purpose: "manage" }, now);
    const day = 24 * 60 * 60 * 1000;
    expect(verify(confirm, "confirm", now + 6 * day)).not.toBeNull();
    expect(verify(confirm, "confirm", now + 8 * day)).toBeNull();
    expect(verify(manage, "manage", now + 800 * day)).toEqual({ sid: "a", purpose: "manage" });
  });

  it("honors an explicit expiry", () => {
    const t = sign({ sid: "a", purpose: "manage", exp: 1000 });
    expect(verify(t, "manage", 999)).not.toBeNull();
    expect(verify(t, "manage", 1001)).toBeNull();
  });

  it("rejects a token used for the wrong purpose", () => {
    expect(verify(sign({ sid: "a", purpose: "manage" }), "confirm")).toBeNull();
    expect(verify(sign({ sid: "a", purpose: "confirm" }), "manage")).toBeNull();
  });

  it("rejects a tampered payload or signature", () => {
    const [body, sig] = sign({ sid: "a", purpose: "manage" }).split(".");
    const forged = Buffer.from(JSON.stringify({ sid: "b", purpose: "manage" })).toString("base64url");
    expect(verify(`${forged}.${sig}`)).toBeNull();
    expect(verify(`${body}.${sig.slice(0, -2)}xx`)).toBeNull();
    expect(verify(`${body}.`)).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    const t = sign({ sid: "a", purpose: "manage" });
    process.env.SESSION_SECRET = "a-different-secret";
    expect(verify(t)).toBeNull();
  });

  it("rejects junk without throwing", () => {
    for (const bad of [undefined, null, 5, "", "bad", "a.b.c", "x".repeat(2000), "..", "e30.e30"]) {
      expect(verify(bad)).toBeNull();
    }
  });
});

describe("confirm token version", () => {
  const id = "11111111-2222-3333-4444-555555555555";
  const updated = "2026-11-13T10:00:00.123456+00:00";

  it("carries the version and only matches the row it was issued for", () => {
    const v = Date.parse(updated);
    const t = verify(sign({ sid: id, purpose: "confirm", v }), "confirm");
    expect(t?.v).toBe(v);
    expect(versionMatches(t?.v, updated)).toBe(true);
    expect(versionMatches(t?.v, "2026-11-13T10:00:05+00:00")).toBe(false);
  });

  it("a token with no version never matches", () => {
    const t = verify(sign({ sid: id, purpose: "confirm" }), "confirm");
    expect(t?.v).toBeUndefined();
    expect(versionMatches(t?.v, updated)).toBe(false);
    expect(versionMatches(5, null)).toBe(false);
    expect(versionMatches(5, "not a date")).toBe(false);
  });

  it("a forged version is rejected by the signature", () => {
    const [body, sig] = sign({ sid: id, purpose: "confirm", v: 1 }).split(".");
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const forged = Buffer.from(JSON.stringify({ ...p, v: 2 })).toString("base64url");
    expect(verify(`${forged}.${sig}`)).toBeNull();
  });
});

describe("non-uuid subscriber ids never reach the database", () => {
  it("accepts a uuid sid", () => {
    expect(verifyForDb(sign({ sid: "11111111-2222-3333-4444-555555555555", purpose: "manage" }), "manage")).not.toBeNull();
  });

  it("rejects the test newsletter's sid and other junk, though the token itself is genuine", () => {
    for (const sid of ["test", "preview", "", "1; drop table", "11111111-2222-3333-4444-55555555555", "11111111-2222-3333-4444-555555555555 "]) {
      const t = sign({ sid, purpose: "manage" });
      expect(verifyForDb(t, "manage")).toBeNull();
    }
    expect(verifyForDb("garbage", "manage")).toBeNull();
  });

  it("still checks the purpose", () => {
    expect(verifyForDb(sign({ sid: "11111111-2222-3333-4444-555555555555", purpose: "confirm" }), "manage")).toBeNull();
  });
});
