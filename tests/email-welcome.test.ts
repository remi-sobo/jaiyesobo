import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HOW_IT_WORKS, confirmEmail, welcomeEmail } from "@/lib/email/templates";

const OLD = process.env.SESSION_SECRET;
beforeEach(() => {
  process.env.SESSION_SECRET = "test-secret";
});
afterEach(() => {
  process.env.SESSION_SECRET = OLD;
});

const BETTING = /\b(bet|bets|betting|odds|wager|wagers|parlay|parlays|payout|payouts|cash|juice|gamble|gambling)\b/i;
const all = (m: { subject: string; html: string; text: string }) => `${m.subject}\n${m.html}\n${m.text}`;

const player = welcomeEmail({ manageToken: "m", relation: "self", results: true, newsletter: true, nickname: "Big Ticket", code: "HOOP-7342" });
const parent = welcomeEmail({ manageToken: "m", relation: "parent", results: true, newsletter: false, nickname: "Lil Dunk", code: "SWISH-1001" });
const fan = welcomeEmail({ manageToken: "m", relation: "self", results: false, newsletter: true });

describe("welcome email", () => {
  it("greets the player by nickname and gives them their code", () => {
    expect(player.subject).toBe("You're in, Big Ticket. Welcome to Run It Back");
    expect(player.html).toContain("HOOP-7342");
    expect(player.text).toContain("Player code: HOOP-7342");
  });

  it("explains every rule", () => {
    for (const s of HOW_IT_WORKS) {
      expect(player.html).toContain(s.title);
      expect(player.text).toContain(s.title);
    }
    expect(player.text).toMatch(/Lock of the Week/);
  });

  it("points to YouTube and Instagram", () => {
    for (const m of [player, parent, fan]) {
      expect(m.html).toContain("https://www.youtube.com/@JaiyeSobo");
      expect(m.html).toContain("https://www.instagram.com/onthecourt_pod");
      expect(m.text).toContain("https://www.youtube.com/@JaiyeSobo");
    }
  });

  it("says more takes are coming when the newsletter is on, and offers it when off", () => {
    expect(player.text).toContain("new takes, episodes and columns as they come");
    const off = welcomeEmail({ manageToken: "m", relation: "self", results: true, newsletter: false, nickname: "X" });
    expect(off.text).toContain("Turn them on");
  });

  it("works for a fan box sign-up with no player", () => {
    expect(fan.subject).toBe("You're in. Welcome to Run It Back");
    expect(fan.html).not.toContain("Player code");
    expect(fan.html).toContain("Play Run It Back");
  });

  it("speaks to the parent, never the child, for under 13", () => {
    expect(parent.subject).toBe("Lil Dunk is all set on Run It Back");
    expect(parent.text).toContain("we only ever email you, never Lil Dunk");
    expect(parent.text).toContain("never ask for their real name");
    expect(parent.html).not.toContain("Hey, it's Jaiye");
  });

  it("has unsubscribe links and headers", () => {
    for (const m of [player, parent, fan]) {
      expect(m.html).toContain("Unsubscribe");
      expect(m.headers["List-Unsubscribe"]).toBeTruthy();
    }
  });

  it("escapes the nickname", () => {
    const x = welcomeEmail({ manageToken: "m", relation: "self", results: true, newsletter: true, nickname: "<i>x</i>" });
    expect(x.html).not.toContain("<i>x</i>");
  });

  it("uses no betting words", () => {
    for (const m of [player, parent, fan, confirmEmail({ confirmToken: "c", manageToken: "m", results: true, newsletter: true })]) {
      expect(all(m)).not.toMatch(BETTING);
    }
  });
});
