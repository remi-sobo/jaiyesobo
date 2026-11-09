import { describe, expect, it } from "vitest";
import { meLine, ordinal } from "@/components/sportsbook/public/last-week";
import { activeTab } from "@/components/sportsbook/public/section-nav";

describe("meLine", () => {
  it("beat one, lost to the other", () => {
    expect(meLine({ rank: 4, points: 1, vsJaiye: -1, vsRemi: 15 })).toBe("You finished 4th with 1 point. You beat Remi by 15 and Jaiye beat you by 1.");
  });
  it("tie and win", () => {
    expect(meLine({ rank: 2, points: 3, vsJaiye: 0, vsRemi: 5 })).toBe("You finished 2nd with 3 points. You beat Remi by 5 and tied Jaiye.");
  });
  it("won the week", () => {
    expect(meLine({ rank: 1, points: 9, vsJaiye: 2, vsRemi: 4 })).toBe("You won the week.");
  });
  it("ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 21, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "21st", "22nd"]);
  });
});

describe("activeTab", () => {
  it("maps paths to tabs", () => {
    expect(activeTab("/runitback")).toBe("/runitback");
    expect(activeTab("/runitback/play")).toBe("/runitback");
    expect(activeTab("/runitback/2026-27/week-3")).toBe("/runitback/results");
    expect(activeTab("/runitback/archive")).toBe("/runitback/standings");
    expect(activeTab("/runitback/leagues/abc")).toBe("/runitback/leagues");
    expect(activeTab("/runitback/privacy")).toBeNull();
  });
});
