import type { NowSnapshot } from "./types";

/**
 * Right now. This is meant to go stale and get rewritten often.
 * `accent` is the one noun in each value set in italic red.
 */
export const now: NowSnapshot = {
  updatedAt: "2026-09-11",
  onCourt: [
    {
      label: "Working on",
      value: "Baseline drive into the inside reverse.",
      accent: "inside reverse",
    },
    {
      label: "Practicing",
      value: "Handle into a pull-up, off both hands.",
      accent: "pull-up",
    },
    {
      label: "Watching",
      value: "Every Blazers preseason game I'm allowed to stay up for.",
      accent: "Blazers",
    },
    {
      label: "Arguing about",
      value: "Whether the Blazers are actually good now. I say yes.",
      accent: "yes",
    },
  ],
  offCourt: [
    {
      label: "Reading",
      value: "The Crossover by Kwame Alexander.",
      accent: "The Crossover",
    },
    {
      label: "Building",
      value: "In Your Pocket, the next game, with my dad.",
      accent: "In Your Pocket",
    },
    {
      label: "Making",
      value: "Ep. 002, the full Blazers preview. Every rotation, every prediction.",
      accent: "Blazers preview",
    },
    {
      label: "Learning",
      value: "How fractions work when the bottom numbers don't match.",
      accent: "fractions",
    },
  ],
  books: [
    {
      title: "The Crossover",
      reaction: "It's a whole book of poems and it still felt fast.",
      finishedOn: "2026-09-02",
    },
    {
      title: "Hoop Genius",
      reaction:
        "Basketball got invented because a class wouldn't behave. That's funny.",
      finishedOn: "2026-08-19",
    },
    {
      title: "Big Nate: In A Class By Himself",
      reaction: "I've read it twice. I'd read it again.",
      finishedOn: "2026-07-30",
    },
  ],
  nextBook: "Becoming Kareem",
};

/** The three rows the homepage lifts out of the full list. */
export function homeRows() {
  const find = (label: string) =>
    [...now.onCourt, ...now.offCourt].find((r) => r.label === label);
  return [find("Working on"), find("Reading"), find("Arguing about")].filter(
    (r) => r !== undefined,
  );
}
