import { describe, expect, it } from "vitest";
import { currentWeekNumber, resultsWeekToSend } from "@/lib/sportsbook/weeks";

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
