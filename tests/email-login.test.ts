import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanCode, hashSecret, newLinkToken, newLoginCode, sameHash } from "@/lib/email/login";
import { loginEmail } from "@/lib/email/templates";
import { checkRealNames, fullName } from "@/lib/sportsbook/players";

const OLD = process.env.SESSION_SECRET;
beforeEach(() => {
  process.env.SESSION_SECRET = "test-secret";
});
afterEach(() => {
  process.env.SESSION_SECRET = OLD;
});

describe("login codes", () => {
  it("are always six digits", () => {
    for (let i = 0; i < 200; i++) expect(newLoginCode()).toMatch(/^\d{6}$/);
  });

  it("link tokens are long and url safe", () => {
    const t = newLinkToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(newLinkToken()).not.toBe(t);
  });

  it("accepts a code typed with spaces or a dash", () => {
    expect(cleanCode("123 456")).toBe("123456");
    expect(cleanCode("123-456")).toBe("123456");
    expect(cleanCode(123456)).toBe("");
  });

  it("hashes depend on the kind and the secret, never store the code itself", () => {
    const h = hashSecret("code", "123456", "a");
    expect(h).not.toContain("123456");
    expect(hashSecret("code", "123456", "a")).toBe(h);
    expect(hashSecret("link", "123456", "a")).not.toBe(h);
    expect(hashSecret("code", "123456", "b")).not.toBe(h);
  });

  it("compares hashes safely", () => {
    expect(sameHash("abc", "abc")).toBe(true);
    expect(sameHash("abc", "abd")).toBe(false);
    expect(sameHash("abc", "abcd")).toBe(false);
  });
});

describe("login email", () => {
  const m = loginEmail({ code: "042917", linkToken: "tok_123", name: "Big Ticket", minutes: 15 });

  it("puts the code in the subject, the body and the plain text", () => {
    expect(m.subject).toBe("042917 is your Run It Back login code");
    expect(m.html).toContain("042 917");
    expect(m.text).toContain("042917");
  });

  it("links to the sign in page with the token", () => {
    expect(m.html).toContain("https://www.jaiyesobo.com/runitback/login?t=tok_123");
    expect(m.text).toContain("https://www.jaiyesobo.com/runitback/login?t=tok_123");
  });

  it("is a one-off: no unsubscribe links or headers", () => {
    expect(m.html).not.toContain("Unsubscribe");
    expect(m.text).not.toContain("Unsubscribe");
    expect(m.headers).toEqual({});
  });

  it("escapes the nickname", () => {
    const x = loginEmail({ code: "000001", linkToken: "t", name: "<b>Hi</b>", minutes: 15 });
    expect(x.html).not.toContain("<b>Hi</b>");
    expect(x.html).toContain("&lt;b&gt;Hi&lt;/b&gt;");
  });

  it("uses the Run It Back look", () => {
    expect(m.html).toContain("#0B0B0C");
    expect(m.html).toContain("#E11D2E");
    expect(m.html).toContain("wordmark_horizontal_dark_email.png");
  });
});

describe("real names", () => {
  it("are optional", () => {
    expect(checkRealNames(undefined, undefined, "13_plus")).toEqual({ ok: true, names: { first_name: null, last_name: null } });
    expect(checkRealNames("", "  ", "13_plus")).toEqual({ ok: true, names: { first_name: null, last_name: null } });
  });

  it("are tidied", () => {
    expect(checkRealNames("  Mary  Jo ", "O'Neil-Smith", "13_plus")).toEqual({ ok: true, names: { first_name: "Mary Jo", last_name: "O'Neil-Smith" } });
    expect(checkRealNames("José", "Núñez", "13_plus").ok).toBe(true);
  });

  it("are refused for under 13 and for an unanswered age", () => {
    expect(checkRealNames("Sam", null, "under_13").ok).toBe(false);
    expect(checkRealNames(null, "Lee", null).ok).toBe(false);
    // No names is fine at any age.
    expect(checkRealNames(null, null, "under_13").ok).toBe(true);
  });

  it("refuse links, digits and long names", () => {
    expect(checkRealNames("http://x.co", null, "13_plus").ok).toBe(false);
    expect(checkRealNames("Sam2", null, "13_plus").ok).toBe(false);
    expect(checkRealNames("a".repeat(31), null, "13_plus").ok).toBe(false);
    expect(checkRealNames(42, null, "13_plus").ok).toBe(false);
  });

  it("join into one line", () => {
    expect(fullName({ first_name: "Jordan", last_name: "Lee" })).toBe("Jordan Lee");
    expect(fullName({ first_name: "Jordan", last_name: null })).toBe("Jordan");
    expect(fullName({ first_name: null, last_name: null })).toBeNull();
  });
});
