import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LastWeekRow } from "@/components/sportsbook/public/last-week";
import { confirmEmail, newsletterEmail, parentConsentEmail, resultsEmail, resultsSubject } from "@/lib/email/templates";

const OLD = { secret: process.env.SESSION_SECRET, addr: process.env.EMAIL_MAILING_ADDRESS };
beforeEach(() => {
  process.env.SESSION_SECRET = "test-secret";
  delete process.env.EMAIL_MAILING_ADDRESS;
});
afterEach(() => {
  process.env.SESSION_SECRET = OLD.secret;
  if (OLD.addr === undefined) delete process.env.EMAIL_MAILING_ADDRESS;
  else process.env.EMAIL_MAILING_ADDRESS = OLD.addr;
});

const row: LastWeekRow = {
  week: 5,
  status: "final",
  jaiye: 14,
  remi: 9,
  winnerName: "Big Ticket",
  winnerPoints: 18,
  top: [
    { name: "Big Ticket", points: 18 },
    { name: "Jaiye", points: 14 },
    { name: "Remi", points: 9 },
    { name: "Hoop Dreams", points: 8 },
    { name: "Swish", points: 7 },
  ],
  beat: { jaiye: 1, remi: 3 },
  nextWeek: 6,
  me: { rank: 3, points: 9, vsJaiye: -5, vsRemi: 0 },
};
const general: LastWeekRow = { ...row, me: undefined };
const recap = "Big Ticket cooked this week. I went 14 and my dad went 9. Next week I want the lock back.";

const BETTING = /\b(bet|bets|betting|odds|wager|wagers|parlay|parlays|payout|payouts|cash|juice)\b/i;
const all = (m: { subject: string; html: string; text: string }) => `${m.subject}\n${m.html}\n${m.text}`;

describe("results email", () => {
  it("has a personal subject for a player who played", () => {
    expect(resultsSubject(row)).toBe("Week 5: Big Ticket won. You finished 3rd.");
    expect(resultsEmail({ season: "2026-27", row, recap, manageToken: "tok" }).subject).toBe("Week 5: Big Ticket won. You finished 3rd.");
  });

  it("has a general subject for everyone else, and handles a tie", () => {
    expect(resultsEmail({ season: "2026-27", row: general, recap, manageToken: "tok" }).subject).toBe("Week 5: Big Ticket won");
    expect(resultsSubject({ ...general, winnerName: null })).toBe("Week 5: it was a tie");
  });

  it("carries the personal line, h2h, top five, two recap sentences and a play button", () => {
    const m = resultsEmail({ season: "2026-27", row, recap, manageToken: "tok" });
    expect(m.text).toContain("You finished 3rd with 9 points.");
    expect(m.text).toContain("Jaiye beat you by 5 points.");
    expect(m.text).toContain("You tied Remi.");
    expect(m.text).toContain("Jaiye 14, Remi 9");
    expect(m.text).toContain("5. Swish 7");
    expect(m.text).toContain("Big Ticket cooked this week. I went 14 and my dad went 9.");
    expect(m.text).not.toContain("Next week I want the lock back");
    expect(m.html).toContain("Play Week 6");
    expect(m.html).toContain("https://www.jaiyesobo.com/runitback/play");
    expect(m.text).toContain("https://www.jaiyesobo.com/runitback/2026-27/week-5");
  });

  it("leaves the play button out when no week is open", () => {
    const m = resultsEmail({ season: "2026-27", row: { ...row, nextWeek: null }, recap, manageToken: "tok" });
    expect(m.html).not.toContain("Play Week");
  });
});

describe("every email", () => {
  const manageToken = "MANAGE.TOKEN";
  const mails = {
    confirm: confirmEmail({ confirmToken: "C.T", manageToken, results: true, newsletter: true }),
    parent: parentConsentEmail({ confirmToken: "C.T", manageToken, playerName: "Big Ticket", results: true, newsletter: true }),
    parentFan: parentConsentEmail({ confirmToken: "C.T", manageToken, results: false, newsletter: true }),
    results: resultsEmail({ season: "2026-27", row, recap, manageToken }),
    resultsGeneral: resultsEmail({ season: "2026-27", row: general, recap, manageToken }),
    episode: newsletterEmail({ kind: "episode", title: "Dame hit a logo three", standfirst: "The Blazers beat the Thunder.", url: "https://www.jaiyesobo.com/pod/x", note: "Watch the end.", manageToken }),
    column: newsletterEmail({ kind: "column", title: "The Grizzlies are 4-0", standfirst: "I owe them one.", url: "https://www.jaiyesobo.com/column/y", manageToken }),
  };

  for (const [name, m] of Object.entries(mails)) {
    it(`${name}: unsubscribe and manage links, headers, footer`, () => {
      expect(m.html).toContain("https://www.jaiyesobo.com/email/preferences?t=MANAGE.TOKEN");
      expect(m.html).toContain("https://www.jaiyesobo.com/api/email/unsubscribe?t=MANAGE.TOKEN");
      expect(m.html).toContain("Manage what I get");
      expect(m.html).toContain("Unsubscribe");
      expect(m.text).toContain("Unsubscribe: https://www.jaiyesobo.com/api/email/unsubscribe?t=MANAGE.TOKEN");
      expect(m.html).toContain("Run It Back Picks · jaiyesobo.com");
      expect(m.headers["List-Unsubscribe"]).toMatch(/^<https:\/\/www\.jaiyesobo\.com\/api\/email\/unsubscribe\?t=MANAGE\.TOKEN>, <mailto:[^>]+>$/);
      expect(m.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    });

    it(`${name}: no betting words and no emoji`, () => {
      expect(all(m)).not.toMatch(BETTING);
      expect(all(m)).not.toMatch(/\p{Extended_Pictographic}/u);
    });
  }

  it("prints the mailing address when set", () => {
    process.env.EMAIL_MAILING_ADDRESS = "123 Example St, East Palo Alto, CA";
    const m = confirmEmail({ confirmToken: "C", manageToken, results: true, newsletter: false });
    expect(m.html).toContain("123 Example St, East Palo Alto, CA");
    expect(m.text).toContain("123 Example St, East Palo Alto, CA");
  });

  it("confirm and parent emails have the right subject, button and ignore line", () => {
    expect(mails.confirm.subject).toBe("Confirm your email for Run It Back");
    expect(mails.confirm.html).toContain("https://www.jaiyesobo.com/email/confirm?t=C.T");
    expect(mails.parent.html).toContain("Yes, send Big Ticket&#39;s results to me".replace("&#39;", "'"));
    expect(mails.parent.html).toContain("If this wasn't you, ignore this email.");
    expect(mails.parent.text).toContain("Big Ticket");
    expect(mails.parentFan.subject).toBe("Please confirm your email for Run It Back");
  });

  it("newsletter speaks in Jaiye's voice", () => {
    expect(mails.episode.subject).toBe("New On The Court: Dame hit a logo three");
    expect(mails.episode.text).toContain("New On The Court is up.");
    expect(mails.episode.text).toContain("Watch the end.");
    expect(mails.column.subject).toBe("New from Jaiye: The Grizzlies are 4-0");
  });

  it("escapes names and titles in HTML", () => {
    const m = newsletterEmail({ kind: "column", title: "<script>x</script>", standfirst: "a & b", url: "https://www.jaiyesobo.com/column/y", manageToken });
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("a &amp; b");
  });
});
