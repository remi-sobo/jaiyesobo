import type { Episode } from "./types";

/** On The Court. Newest first. */
export const episodes: Episode[] = [
  {
    number: 1,
    slug: "season-kickoff",
    title: "Season kickoff: the craziest offseason ever",
    titleAccent: "offseason ever",
    standfirst:
      "Giannis to Miami, LeBron to Philly, Ja to Portland. We recap all of it, then I give every prediction I'm standing on.",
    date: "2026-09-09",
    runtime: "19:24",
    guests: "Jaiye and Dad",
    youtubeId: "2X_Jk5WE1ZE",
    vaultId: "season-2026",
    chapters: [
      {
        time: "00:41",
        text: "The moves we still can't believe. Giannis to Miami, LeBron and Jaylen Brown to Philly, Kawhi back in Toronto, Ja to Portland, LaMelo to Minnesota.",
      },
      {
        time: "01:34",
        text: "Best move of the summer. I start on Jaylen Brown to the Sixers and change my own mind live.",
      },
      {
        time: "03:38",
        text: "Worst move. Milwaukee traded their franchise player for Tyler freaking Herro.",
      },
      {
        time: "04:51",
        text: "Who won the whole summer, and why an in shape Joel Embiid changes Philly's ceiling.",
      },
      {
        time: "06:47",
        text: "Predictions. Wemby for MVP, and I say he ends up with seven of them.",
      },
      {
        time: "08:27",
        text: "The Finals I'm calling: Sixers out of the East, Spurs out of the West, Spurs win it.",
      },
      {
        time: "10:36",
        text: "The team nobody's talking about. Rip City, with Dame back and Ja in the lanes. I've got them in the second round.",
      },
      {
        time: "12:08",
        text: "Three seconds, then one sentence why.",
        segment: "Buy or Sell",
      },
      {
        time: "13:31",
        text: "My rule: I have to actually be blind. Then In Your Pocket, one word per player.",
        segment: "Blind Rank",
      },
      {
        time: "15:49",
        text: "Dad makes me defend the Sixers over the Knicks in five points.",
        segment: "Hot Seat",
      },
      {
        time: "17:27",
        text: "Over or under, then the one take I'm a little worried about.",
      },
    ],
  },
];

/** The recurring bits, in running order. Shown as badges on /pod. */
export const SEGMENTS = [
  "Buy or Sell",
  "Blind Rank",
  "In Your Pocket",
  "Hot Seat",
  "The Vault",
] as const;

export function getEpisode(slug: string): Episode | undefined {
  return episodes.find((e) => e.slug === slug);
}

export function latestEpisode(): Episode {
  return episodes[0];
}
