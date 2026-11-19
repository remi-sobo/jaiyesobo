import { describe, expect, it } from "vitest";
import { APPROVED_KEY, isPrepDay, lastLock, opensAt, shouldOpen } from "@/lib/sportsbook/autopilot";
import { pacificMidnight } from "@/lib/sportsbook/weeks";

const iso = (d: Date) => d.toISOString();

describe("opensAt", () => {
  it("is Sunday 6:00pm PST before a normal Monday week", () => {
    // DST ended Sun Nov 1 2026, so Monday Nov 2 midnight is 08:00Z (PST) and Sunday 6pm is 02:00Z.
    expect(iso(opensAt({ starts_on: "2026-11-02" }, null))).toBe("2026-11-02T02:00:00.000Z");
    // Mon Mar 8 2027 is still PST.
    expect(iso(opensAt({ starts_on: "2027-03-08" }, null))).toBe("2027-03-08T02:00:00.000Z");
  });

  it("is Sunday 6:00pm PDT when DST just started (week of Mar 15 2027)", () => {
    // DST began Sun Mar 14 2027, so Monday midnight is 07:00Z and 6pm Sunday is 01:00Z.
    expect(iso(opensAt({ starts_on: "2027-03-15" }, null))).toBe("2027-03-15T01:00:00.000Z");
    expect(iso(opensAt({ starts_on: "2026-10-19" }, null))).toBe("2026-10-19T01:00:00.000Z");
  });

  it("is six hours before Pacific midnight in every case", () => {
    for (const d of ["2026-10-19", "2026-11-02", "2027-03-08", "2027-03-15", "2027-11-08"]) {
      expect(pacificMidnight(d).getTime() - opensAt({ starts_on: d }, null).getTime()).toBe(6 * 3_600_000);
    }
  });

  it("waits for the previous week's last lock when it is later than 6pm", () => {
    const lock = new Date("2026-11-02T03:30:00Z"); // Sun Nov 1 7:30pm PST
    expect(iso(opensAt({ starts_on: "2026-11-02" }, lock))).toBe(iso(lock));
  });

  it("ignores a previous lock that is earlier than 6pm", () => {
    const lock = new Date("2026-11-01T22:00:00Z"); // Sun 2pm PST
    expect(iso(opensAt({ starts_on: "2026-11-02" }, lock))).toBe("2026-11-02T02:00:00.000Z");
  });
});

describe("lastLock", () => {
  it("is the latest lock, or null with none", () => {
    expect(lastLock([])).toBeNull();
    expect(iso(lastLock([{ locks_at: "2026-11-01T01:00:00Z" }, { locks_at: "2026-11-02T03:30:00Z" }, { locks_at: "bad" }])!)).toBe("2026-11-02T03:30:00.000Z");
  });
});

describe("shouldOpen", () => {
  const opensAtT = new Date("2026-11-02T02:00:00Z");
  const weekStart = new Date("2026-11-02T08:00:00Z");
  const at = (s: string) => new Date(s);

  it("approved, before opensAt: waits", () => {
    expect(shouldOpen({ approved: true, now: at("2026-11-02T01:59:00Z"), opensAt: opensAtT, weekStart })).toBe(false);
  });
  it("approved, at and after opensAt: opens", () => {
    expect(shouldOpen({ approved: true, now: opensAtT, opensAt: opensAtT, weekStart })).toBe(true);
    expect(shouldOpen({ approved: true, now: at("2026-11-02T05:00:00Z"), opensAt: opensAtT, weekStart })).toBe(true);
  });
  it("not approved, after opensAt but before the week starts: waits", () => {
    expect(shouldOpen({ approved: false, now: at("2026-11-02T07:59:00Z"), opensAt: opensAtT, weekStart })).toBe(false);
  });
  it("not approved, at and after the week start: opens anyway", () => {
    expect(shouldOpen({ approved: false, now: weekStart, opensAt: opensAtT, weekStart })).toBe(true);
    expect(shouldOpen({ approved: false, now: at("2026-11-03T20:00:00Z"), opensAt: opensAtT, weekStart })).toBe(true);
  });
  it("a late previous lock holds an approved week back, but never past the week start", () => {
    const late = new Date("2026-11-02T03:30:00Z");
    expect(shouldOpen({ approved: true, now: at("2026-11-02T03:00:00Z"), opensAt: late, weekStart })).toBe(false);
    expect(shouldOpen({ approved: true, now: at("2026-11-02T03:30:00Z"), opensAt: late, weekStart })).toBe(true);
  });
});

describe("isPrepDay", () => {
  it("is true Saturday and Sunday Pacific", () => {
    expect(isPrepDay(new Date("2026-11-14T18:00:00Z"))).toBe(true); // Sat 10am PST
    expect(isPrepDay(new Date("2026-11-15T10:00:00Z"))).toBe(true); // Sun 2am PST (the nightly cron)
  });
  it("is false Friday and Monday", () => {
    expect(isPrepDay(new Date("2026-11-13T18:00:00Z"))).toBe(false); // Fri
    expect(isPrepDay(new Date("2026-11-16T11:00:00Z"))).toBe(false); // Mon 3am PST (the weekly cron)
  });
  it("is false for an instant that is Saturday in UTC but still Friday in Pacific", () => {
    expect(isPrepDay(new Date("2026-11-14T05:00:00Z"))).toBe(false); // Fri 9pm PST
  });
  it("is true for an instant that is Monday in UTC but still Sunday in Pacific", () => {
    expect(isPrepDay(new Date("2026-11-16T05:00:00Z"))).toBe(true); // Sun 9pm PST
  });
});

describe("APPROVED_KEY", () => {
  it("is keyed by season and week", () => {
    expect(APPROVED_KEY(5)).toBe("sb_approved:2026-27:5");
  });
});
