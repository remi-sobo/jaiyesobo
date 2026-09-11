import type { Game } from "./types";

/**
 * Games Jaiye came up with. He decides the rules, then he and his dad build
 * them. Only `live` games link anywhere; the gameplay itself lives under
 * `/games/[slug]` and is not part of this content layer.
 */
export const games: Game[] = [
  {
    number: 1,
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
    number: 2,
    slug: "in-your-pocket",
    title: "In Your Pocket",
    description: "One word per player. It's a segment on the pod first, then a game.",
    status: "building",
  },
  {
    number: 3,
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
