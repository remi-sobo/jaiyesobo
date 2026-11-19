import { describe, expect, it } from "vitest";
import { IP_LOG_DAYS, UNCONFIRMED_EMAIL_DAYS, cutoff } from "@/lib/privacy/cleanup";

describe("privacy cleanup", () => {
  it("cuts off the right number of days back", () => {
    const now = new Date("2026-11-15T10:00:00.000Z");
    expect(cutoff(30, now)).toBe("2026-10-16T10:00:00.000Z");
    expect(cutoff(14, now)).toBe("2026-11-01T10:00:00.000Z");
  });

  it("keeps the numbers the privacy page promises", () => {
    expect(IP_LOG_DAYS).toBe(30);
    expect(UNCONFIRMED_EMAIL_DAYS).toBe(14);
  });

  it("waits longer than the 7 day confirm catch-up before deleting", () => {
    expect(UNCONFIRMED_EMAIL_DAYS).toBeGreaterThan(7);
  });
});
