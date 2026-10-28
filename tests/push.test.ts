import { describe, expect, it } from "vitest";
import { recapPreview } from "@/lib/sportsbook/push";

describe("recapPreview", () => {
  it("leaves short text unchanged", () => {
    expect(recapPreview("I won by 3 points. Dad is sleeping on me.")).toBe("I won by 3 points. Dad is sleeping on me.");
  });

  it("collapses newlines and extra spaces", () => {
    expect(recapPreview("  I won.\n\nDad lost.   Easy.  ")).toBe("I won. Dad lost. Easy.");
  });

  it("cuts long text at a word boundary, under 90 chars, with an ellipsis", () => {
    const text =
      "I won the week by 4 points and my dad did not like it one bit. My best call was the Warriors and my worst miss was the over.";
    const out = recapPreview(text);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThan(90);
    const body = out.slice(0, -1);
    // Whole words only: what's left is the start of the original, ending where a word ended.
    expect(text.startsWith(body)).toBe(true);
    expect(text.charAt(body.length)).toBe(" ");
  });

  it("keeps all the words when the cut lands exactly on a word end", () => {
    const head = "a".repeat(40) + " " + "b".repeat(47); // 88 chars
    expect(recapPreview(`${head} cccc dddd`)).toBe(`${head}…`);
  });

  it("drops trailing punctuation before the ellipsis", () => {
    const text = `${"word ".repeat(16)}end, then more words after the comma here`;
    const out = recapPreview(text);
    expect(out).not.toMatch(/[,;:.]…$/);
    expect(out.endsWith("…")).toBe(true);
  });

  it("hard cuts a single giant word, still under 90 chars", () => {
    const out = recapPreview("x".repeat(300));
    expect(out).toBe(`${"x".repeat(88)}…`);
    expect(out.length).toBeLessThan(90);
  });

  it("is empty for blank text", () => {
    expect(recapPreview("   \n ")).toBe("");
  });
});
