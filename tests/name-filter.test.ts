import { describe, expect, it } from "vitest";

import { checkDisplayName, isClean } from "@/lib/sportsbook/players";

describe("name filter bypasses", () => {
  // Escapes keep the lookalike letters visible in review.
  const bypasses: Array<[string, string]> = [
    ["accented letter", "fúck"],
    ["stretched letters", "fuuuck"],
    ["stretched letters, other word", "biiitch"],
    ["Cyrillic lookalike", "fuсk"],
    ["Greek lookalike", "shιt"],
    ["Greek nu for v", "fνck"],
    ["fullwidth letters", "ＦＵＣＫ"],
    ["v for u", "fvck"],
    ["number swaps", "Sh1t Show"],
    ["whole-word term with a Cyrillic a", "аss"],
    ["whole-word term with a number", "A55"],
    ["whole-word term, stretched", "Asss"],
  ];

  it.each(bypasses)("rejects %s", (_label, name) => {
    expect(isClean(name)).toBe(false);
    expect(checkDisplayName(name).ok).toBe(false);
  });

  it("still accepts plain names", () => {
    for (const name of ["Marcus", "Priya K", "Big Ticket", "Assassin Dad", "Uncle Dele", "Jeremiah", "Knight", "Bobby", "Steve V", "Jaiyeola", "Remington", "Badminton Bob", "Premier"]) {
      expect(checkDisplayName(name)).toEqual({ ok: true, name });
    }
  });

  it("doesn't flag words that only look like a blocked one", () => {
    expect(isClean("Sexton Fans")).toBe(true);
    expect(isClean("Assassin")).toBe(true);
    expect(isClean("Night Owl")).toBe(true);
  });
});

describe("names that pass for the house", () => {
  it.each(["Real Remi", "Jaiye.", "remi2", "R3mi", "Jаiye", "Jaiye Sobo", "The Admin", "RunItBack", "Official Fan"])("rejects %s", (name) => {
    expect(checkDisplayName(name)).toEqual({ ok: false, error: "Pick a different name." });
  });

  it("keeps the exact house names taken", () => {
    expect(checkDisplayName("Remi")).toEqual({ ok: false, error: "That name is taken." });
  });
});
