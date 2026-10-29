import { formatDate } from "./format";
import type { Episode } from "./types";

/** On The Court. Newest first. */
export const episodes: Episode[] = [
  {
    // Chapters, runtime and the article land once the video has been gone through.
    number: 3,
    slug: "sportsbook-week-2",
    title: "Week 2: my Run It Back picks",
    titleAccent: "Week 2",
    standfirst: "Every one of my Week 2 picks, and where me and my dad split.",
    date: "2026-10-25",
    guests: "Jaiye",
    youtubeId: "WJg6fSmiaDY",
    sportsbookWeek: 2,
    chapters: [],
  },
  {
    number: 2,
    slug: "sportsbook-week-1",
    title: "Opening night: my Week 1 Sportsbook picks",
    titleAccent: "Week 1",
    standfirst:
      "First day of the season, so I went through every one of my Sobo Sportsbook picks. My dad got a lot of clown emojis.",
    date: "2026-10-20",
    runtime: "11:30",
    guests: "Jaiye",
    youtubeId: "m3zazl94p4E",
    sportsbookWeek: 1,
    myTake: "The Mavs aren't winning that game. San Antonio wins the whole thing this year.",
    chapters: [
      { time: "00:00", text: "Welcome back. The Sobo Sportsbook drops on day one of the season." },
      { time: "00:37", text: "Celtics or Pistons for the first W. My dad gets a clown emoji." },
      { time: "01:30", text: "Who drops the most in one game: Tatum, Jalen Williams, Brunson or Booker." },
      { time: "02:19", text: "Do the Knicks beat Philly by 4 or more?" },
      { time: "03:19", text: "How many games do the Knicks win this week? I say two." },
      { time: "04:37", text: "Jalen Williams or De'Aaron Fox on Tuesday." },
      { time: "05:47", text: "Checking my mom's picks. Then Hawks vs Magic, over or under." },
      { time: "06:29", text: "The Upset Special. I'm riding with Portland.", segment: "Upset Special" },
      { time: "07:58", text: "Lakers or Warriors. Steph is old folk." },
      { time: "08:29", text: "Closest guess: total points in Lakers vs Warriors." },
      { time: "10:23", text: "Mavs vs Spurs. I've got San Antonio winning it all." },
      { time: "11:07", text: "How the leaderboard works. Signing out." },
    ],
    article: [
      {
        kind: "p",
        text: "Whadup, y'all. Welcome to the On The Court article. Today is the first day of the NBA season, and me and my dad just dropped the Sobo Sportsbook. Let's get into it.",
      },
      {
        kind: "p",
        text: "Here's how it works. Every Monday new picks drop. You pick every game, you get one Lock of the Week, and once a game starts you can't change it. Most points by Sunday wins the week. And you can play against us.",
      },
      {
        kind: "p",
        text: "First one. Celtics or Pistons, who gets the first W of the season? I took the Celtics. I have a feeling Jayson Tatum goes off, and I think their new guys are gonna be pretty good. My dad took the Pistons. Somebody gave me a laughing emoji. I'm pretty sure it was my dad. So he got a clown emoji.",
      },
      {
        kind: "pull",
        lines: ["He's a clown, bro.", "He's a clown, bro.", "He's a clown, bro."],
        accentLast: true,
      },
      {
        kind: "p",
        text: "Who drops the most in one game this week: Tatum, Jalen Williams, Brunson or Booker? We both said Brunson. 75 percent of y'all said Brunson too. Nobody picked Jalen Williams or Book. I didn't pick them either, but come on. That's still kinda disrespectful.",
      },
      {
        kind: "p",
        text: "Do the Knicks beat Philly by 4 or more? I said yes. My dad said no. The Knicks kept their team together, so they already know how everybody plays. They've been building that for like three years. That's chemistry.",
      },
      {
        kind: "p",
        text: "How many games do the Knicks win this week? I said two. My dad said zero or one. That's just bad, bro. 88 percent of y'all said two. So it's me and everybody against my dad.",
      },
      {
        kind: "p",
        text: "Jalen Williams or De'Aaron Fox on Tuesday? I took Jalen Williams. People forget about him because Shai is on that team. But when he's healthy he can really go, and he's healthy right now. 63 percent of y'all agree with me.",
      },
      {
        kind: "p",
        text: "Hawks vs Magic, over or under 224.5 points? Me, my dad and my mom all said under. Those teams just aren't scoring like that.",
      },
      {
        kind: "p",
        text: "Then the Upset Special. You pick one underdog to win. I took Portland over Phoenix. That's my team and I believe in them. Most of y'all took the Wizards over Milwaukee. Somebody even took the Pelicans over Indiana. Bold.",
      },
      {
        kind: "p",
        text: "Lakers or Warriors? Lakers. Luka is at his peak. I'm taking Luka over Steph any day. Steph is old folk. The Warriors are my least favorite team and I've never believed in them.",
      },
      { kind: "note", text: "Steph, I hope you're not reading this." },
      {
        kind: "p",
        text: "The hard one. Guess the total points in Lakers vs Warriors. Closest guess wins, and if you hit it exactly you get double. I said 237. My dad said 235. So if they score 236 or more, I win that one.",
      },
      {
        kind: "p",
        text: "Last one. Mavs vs Spurs on Saturday, how much do the Mavs win by? The Mavs aren't winning. Cooper Flagg vs Dylan Harper, the number 1 pick against the number 2 pick. I think San Antonio wins the whole thing this year. And Wemby is winning MVP. It's his year.",
      },
      {
        kind: "p",
        text: "One more thing. You can tap anybody's name on the leaderboard and see all their picks, their points, and if they beat me or my dad. So go play at jaiyesobo.com/sportsbook. On The Court, signing out. Peace.",
      },
    ],
  },
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

/**
 * The Run It Back episode for a week, or with no week the newest one (the
 * homepage). A week with no episode yet gets nothing rather than another
 * week's video, so a new week's video can be added together with its picks.
 */
export function sportsbookEpisode(week?: number): Episode | undefined {
  if (week !== undefined) return episodes.find((e) => e.sportsbookWeek === week);
  return episodes.find((e) => e.sportsbookWeek !== undefined);
}

/** The "date · runtime · guests" eyebrow. Runtime is skipped until it's known. */
export function episodeMeta(ep: Episode): string {
  return [formatDate(ep.date), ep.runtime, ep.guests].filter(Boolean).join(" · ");
}
