import { describe, expect, it } from "vitest";
import { playerAlertEmail } from "@/lib/email/templates";
import { SIGNUP_ALERT_TO } from "@/lib/sportsbook/contact";

const base = { nickname: "Big Ticket", realName: "Jordan Lee", ageBand: "13_plus" as const, via: "website" as const, hasEmail: true, total: 31 };

describe("player alert email", () => {
  it("goes to Remi and Jaiye", () => {
    expect([...SIGNUP_ALERT_TO]).toEqual(["remi@ambitionangels.org", "jaiyesobo@gmail.com"]);
  });

  it("names a first timer with their real name", () => {
    const m = playerAlertEmail({ ...base, kind: "new" });
    expect(m.subject).toBe("New player: Big Ticket (Jordan Lee)");
    expect(m.text).toContain("Status: First timer");
    expect(m.text).toContain("Real name: Jordan Lee");
    expect(m.text).toContain("Players now: 31");
  });

  it("flags a sign-up that looks like an earlier player", () => {
    const m = playerAlertEmail({ ...base, kind: "new", lookslike: "BT23" });
    expect(m.subject).toBe("New sign-up (looks like BT23): Big Ticket (Jordan Lee)");
    expect(m.text).toContain('Looks like a returner: was "BT23"');
  });

  it("calls a sign-in on a new device a returner, with how they got in", () => {
    const m = playerAlertEmail({ ...base, kind: "back", how: "email code", via: "app" });
    expect(m.subject).toBe("Back again: Big Ticket (Jordan Lee)");
    expect(m.text).toContain("Returner: signed back in with email code");
    expect(m.text).toContain("Signed in on: The app");
  });

  it("never asks an under-13 for a real name", () => {
    const m = playerAlertEmail({ ...base, kind: "new", realName: null, ageBand: "under_13" });
    expect(m.subject).toBe("New player: Big Ticket");
    expect(m.text).toContain("Real name: Not asked (under 13)");
    expect(m.text).toContain("Age: Under 13");
  });

  it("carries no email address and no unsubscribe", () => {
    const m = playerAlertEmail({ ...base, kind: "new" });
    expect(m.text).toContain("Email: Added");
    expect(m.html).not.toMatch(/[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    expect(m.html).not.toContain("Unsubscribe");
    expect(m.headers).toEqual({});
  });

  it("escapes the nickname", () => {
    const m = playerAlertEmail({ ...base, kind: "new", nickname: "<b>x</b>" });
    expect(m.html).not.toContain("<b>x</b>");
  });
});
