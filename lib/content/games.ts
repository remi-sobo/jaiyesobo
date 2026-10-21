import type { Game } from "./types";

/**
 * Games Jaiye came up with. He decides the rules, then he and his dad build
 * them. Only `live` games link out; the gameplay itself lives under
 * `/games/[slug]` and is not part of this content layer.
 *
 * `featuredGame()` picks the hero. Blind Rank is first in the array, which
 * is how it ends up at the top of /games — the editorial choice we're making
 * is "feature the newest live one," and when a new game ships it moves to
 * the top of this file.
 */
export const games: Game[] = [
  {
    number: 9,
    slug: "blind-rank",
    title: "Blind Rank",
    titleAccent: "Rank",
    description:
      "A player shows up. You pick his slot. Once it's locked you can't move it, and you still don't know who's coming next. Five rounds, then you see your list.",
    status: "live",
    href: "/games/blind-rank",
    screenshot: "/blind-rank.png",
    credit: "Jaiye's idea. We built it together.",
  },
  {
    number: 8,
    slug: "the-cut",
    title: "The Cut",
    description: "Keep four. Cut four. Don't blink.",
    status: "live",
    href: "/games/the-cut",
  },
  {
    number: 7,
    slug: "draft-wheel",
    title: "Draft Wheel",
    description: "Spin for a team. Pick the best player at the spot. The AI decides.",
    status: "live",
    href: "/games/draft-wheel",
  },
  {
    number: 6,
    slug: "crossword",
    title: "Crossword",
    description: "NBA crosswords. Fill the whole grid.",
    status: "live",
    href: "/games/crossword",
  },
  {
    number: 5,
    slug: "word-search",
    title: "Word Search",
    description: "NBA word search. Find every word before time runs out.",
    status: "live",
    href: "/games/word-search",
  },
  {
    number: 4,
    slug: "goat-roster",
    title: "GOAT Roster",
    description:
      "Pick 5 starters and a 6th man from one team, all time. The AI grades your squad.",
    status: "live",
    href: "/games/goat-roster",
  },
  {
    number: 3,
    slug: "draft",
    title: "NBA All-Time Draft",
    description:
      "Pick a team. Draft 5 starters from all time. Play the computer or a friend.",
    status: "live",
    href: "/games/draft",
  },
  {
    number: 2,
    slug: "trivia",
    title: "NBA Trivia",
    description: "10 NBA questions a round. New ones every week. Don't get cooked.",
    status: "live",
    href: "/games/trivia",
  },
  {
    number: 1,
    slug: "top-five",
    title: "Top 5 [Blank]",
    description: "Pick your top 5 in any NBA category. The AI judges your list.",
    status: "live",
    href: "/games/top-five",
  },
  {
    number: 10,
    slug: "in-your-pocket",
    title: "In Your Pocket",
    description: "One word per player. It's a segment on the pod first, then a game.",
    status: "building",
  },
  {
    number: 11,
    slug: "buy-or-sell",
    title: "Buy or Sell",
    description: "You get three seconds. No thinking allowed after that.",
    status: "idea",
  },
];

export const GAME_STATUS_LABEL = {
  live: "Live now",
  building: "Building",
  idea: "Just an idea",
} as const;

/** The homepage and /games both feature the one game you can actually play. */
export function featuredGame(): Game {
  return games.find((g) => g.status === "live") ?? games[0];
}
