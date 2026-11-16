import { describe, expect, it } from "vitest";
import { currentWeekNumber, resultsWeekToSend, weekIsOver } from "@/lib/sportsbook/weeks";

// Monday Nov 16, 2026, 2am Pacific: the nightly run that sent Weeks 2 and 3 by mistake.
const now = new Date("2026-11-16T10:00:00Z");
const real = [
  { week_number: 1, status: "final", finalized_at: "2026-10-26T03:12:07Z", recap: "r" },
  { week_number: 2, status: "final", finalized_at: "2026-11-09T15:11:12Z", recap: "r" },
  { week_number: 3, status: "final", finalized_at: "2026-11-09T15:28:05Z", recap: "r" },
  { week_number: 4, status: "graded", finalized_at: null, recap: "r" },
  { week_number: 5, status: "open", finalized_at: null, recap: null },
];

describe("which results email goes out", () => {
  it("is Week 5 on Monday Nov 16", () => {
    expect(currentWeekNumber(now)).toBe(5);
  });

  it("never sends Weeks 2 or 3 late, and waits for Week 4 to be final", () => {
    expect(resultsWeekToSend(real, now)).toBeNull();
  });

  it("sends Week 4 once it goes final", () => {
    const final4 = real.map((w) => (w.week_number === 4 ? { ...w, status: "final", finalized_at: "2026-11-17T10:00:00Z" } : w));
    expect(resultsWeekToSend(final4, new Date("2026-11-17T10:05:00Z"))).toBe(4);
  });

  it("holds a week with no recap for 36 hours, then sends it anyway", () => {
    const noRecap = [{ week_number: 4, status: "final", finalized_at: "2026-11-17T10:00:00Z", recap: null }];
    expect(resultsWeekToSend(noRecap, new Date("2026-11-17T12:00:00Z"))).toBeNull();
    expect(resultsWeekToSend(noRecap, new Date("2026-11-18T23:00:00Z"))).toBe(4);
  });

  it("stops once the next week has ended too", () => {
    const final4 = [{ week_number: 4, status: "final", finalized_at: "2026-11-17T10:00:00Z", recap: "r" }];
    expect(resultsWeekToSend(final4, new Date("2026-11-24T10:00:00Z"))).toBeNull();
  });
});

describe("Sunday night", () => {
  // Week 4 closed right after Sunday's last game, 10:40pm Pacific Nov 15.
  const sunday = new Date("2026-11-16T06:40:00Z");
  const closed = [
    { week_number: 3, status: "final", finalized_at: "2026-11-09T15:28:05Z", recap: "r" },
    { week_number: 4, status: "final", finalized_at: "2026-11-16T06:30:00Z", recap: "r" },
    { week_number: 5, status: "open", finalized_at: null, recap: null },
  ];

  it("is still Week 4 by the calendar", () => {
    expect(currentWeekNumber(sunday)).toBe(4);
  });

  it("sends Week 4 that night, not Week 3", () => {
    expect(resultsWeekToSend(closed, sunday)).toBe(4);
  });

  it("waits for the recap when it isn't written yet", () => {
    const noRecap = closed.map((w) => (w.week_number === 4 ? { ...w, recap: null } : w));
    expect(resultsWeekToSend(noRecap, sunday)).toBeNull();
  });
});

describe("when a week is over", () => {
  const bounds = { start: new Date("2026-11-09T08:00:00Z"), end: new Date("2026-11-16T08:00:00Z") };
  const g = (tip: string, status: number, postponed = false) => ({ tip_at: tip, status, postponed });
  const sundayNight = new Date("2026-11-16T06:40:00Z");

  it("is over once Sunday's last game is final, before midnight", () => {
    expect(weekIsOver(bounds, [g("2026-11-11T00:30:00Z", 3), g("2026-11-16T02:00:00Z", 3)], sundayNight)).toBe(true);
  });

  it("isn't while a game is still going", () => {
    expect(weekIsOver(bounds, [g("2026-11-11T00:30:00Z", 3), g("2026-11-16T02:00:00Z", 2)], sundayNight)).toBe(false);
  });

  it("ignores postponed games", () => {
    expect(weekIsOver(bounds, [g("2026-11-16T02:00:00Z", 3), g("2026-11-16T03:00:00Z", 1, true)], sundayNight)).toBe(true);
  });

  it("doesn't close early when the schedule ends before Sunday", () => {
    expect(weekIsOver(bounds, [g("2026-11-13T00:00:00Z", 3)], new Date("2026-11-14T06:00:00Z"))).toBe(false);
  });

  it("is always over at midnight Pacific", () => {
    expect(weekIsOver(bounds, [g("2026-11-16T02:00:00Z", 2)], new Date("2026-11-16T08:00:00Z"))).toBe(true);
    expect(weekIsOver(bounds, [], new Date("2026-11-16T08:00:00Z"))).toBe(true);
  });
});
