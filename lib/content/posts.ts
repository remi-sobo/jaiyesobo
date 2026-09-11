import type { Post } from "./types";

/**
 * The Column. Newest first.
 *
 * Jaiye's words. Grammar and formatting get cleaned up, the opinion never
 * does. Drafts stay in this list and are filtered out of production by
 * `publishedPosts()`, so an unfinished piece is still reviewable in dev.
 */
export const posts: Post[] = [
  {
    number: 3,
    slug: "ja-to-the-blazers",
    title: "Ja to the Blazers. Bad move on the Grizzlies' part?",
    titleAccent: "Grizzlies' part?",
    standfirst:
      "Biggest trade of the offseason. I'm a Blazers fan, so fair warning, I might glaze the Blazers a little.",
    dek: "Portland got an All-Star for Jerami Grant and Kris Murray. Memphis keeps making other teams better.",
    topic: "Blazers",
    date: "2026-09-11",
    readMinutes: 4,
    myTake:
      "Portland gave up Jerami Grant and Kris Murray for an All-Star. Memphis keeps making other teams better and does nothing for itself.",
    status: "published",
    body: [
      {
        kind: "p",
        text: "Whadup, y'all. Welcome to the On The Court article. My name's Jaiye. Let's get into it.",
      },
      {
        kind: "p",
        text: "Ja Morant is a Blazer, and I think it makes them better right away. Now they've got a one, two, three punch: Dame, Deni and Ja. They already had the defense. Ja is the offense.",
      },
      {
        kind: "p",
        text: "The only thing that stops them is Ja himself. His health, his attitude, all of it. But I've got a feeling he stays healthy, and when he's healthy he scores. 17.8 as a rookie in 2019. 19.1 in 2020. 26.2 in 2022. That's not a guy you talk yourself out of.",
      },
      {
        kind: "p",
        text: "And that wasn't even the main part of the trade for Portland. The main part is what they gave up: Jerami Grant and Kris freaking Murray. For an All-Star.",
      },
      {
        kind: "pull",
        lines: [
          "Bums for an All-Star.",
          "Bums for an All-Star.",
          "Bums for an All-Star.",
          "Bums for an All-Star.",
        ],
        accentLast: true,
      },
      {
        kind: "p",
        text: "Now that Dame is back they've got a real trio. It isn't the best trio in the league. But it's a trio, and a year ago they didn't have one.",
      },
      { kind: "note", text: "I'm standing on this one. Ask me again in June." },
      {
        kind: "p",
        text: "Great trade for the Blazers. Horrible trade for the Grizzlies. First they moved JJJ, now this, and they still haven't gotten good players back for either one. They should fire Zach Kleiman, the way the Mavs did with Nico Harrison.",
      },
      {
        kind: "p",
        text: "But I'm a Blazers fan, so I'm happy. Nice job, Portland. See you next week. On The Court article, signing out. Peace. And no funny business in Portland, Ja.",
      },
    ],
  },
  {
    number: 2,
    slug: "steph-should-play-in-the-corner-more",
    title: "Steph should play in the corner more",
    titleAccent: "corner",
    standfirst:
      "Everybody guards him at the top of the key. So quit putting him there.",
    topic: "Warriors",
    date: "2026-08-28",
    readMinutes: 4,
    myTake:
      "The Warriors get more out of Steph off the ball than they do with him running it.",
    status: "published",
    body: [
      {
        kind: "p",
        text: "When Steph brings the ball up, two guys meet him at half court. He has to work for twenty feet before anything even starts. That's a lot of energy for nothing.",
      },
      {
        kind: "p",
        text: "Put him in the corner instead. Now his defender has to watch him the whole time and the corner is the one spot you can't help from. If the defender looks away, Steph's gone. If he doesn't look away, somebody else is open.",
      },
      {
        kind: "p",
        text: "My dad says that's called gravity. I say it's just being scared of him in a better place on the floor.",
      },
      {
        kind: "p",
        text: "I watched a game where he set two screens in a row and then got the ball on the second one and it was already over. He didn't dribble once. That's the version I like.",
      },
      {
        kind: "p",
        text: "The problem is somebody else has to be able to pass. If your point guard can't hit a guy running out of a corner, none of this works and you're back to Steph dribbling up.",
      },
      {
        kind: "p",
        text: "So here's what I'd do. He starts with the ball on maybe a third of the possessions, not all of them. The rest of the time he's moving and somebody else is bringing it. Save his legs for the fourth quarter, because that's when we need him anyway.",
      },
    ],
  },
  {
    number: 1,
    slug: "rebounding-is-a-choice",
    title: "Rebounding is a choice",
    titleAccent: "choice",
    standfirst:
      "You don't need to be tall. You need to want it before the ball comes off.",
    topic: "NBA",
    date: "2026-08-14",
    readMinutes: 3,
    myTake: "Almost every rebound is decided before the shot even hits the rim.",
    status: "published",
    body: [
      {
        kind: "p",
        text: "I'm not the tallest kid on my team. I still get rebounds, and here's why.",
      },
      {
        kind: "p",
        text: "When the shot goes up, most kids watch it. They stand there with their head back like it's a movie. That's the second you're supposed to be moving, not watching.",
      },
      {
        kind: "p",
        text: "I go find the guy near me and put my back into him first. Then I look. If I do it in that order, I already have the spot and he has to go around me, and by then the ball is in my hands.",
      },
      {
        kind: "p",
        text: "The other thing is where the ball goes. Long shots come off long. If somebody shoots a three from the wing, I don't stand under the rim, I step out to the free throw line. I get a lot of them out there because nobody's out there with me.",
      },
      { kind: "note", text: "This is my whole game honestly." },
      {
        kind: "p",
        text: "Coach says rebounding is effort. I think it's effort plus knowing one second before everybody else. You can practice both of those.",
      },
    ],
  },
  {
    number: 4,
    slug: "rookies-who-actually-matter",
    title: "The rookies who are actually going to matter this season",
    standfirst: "Not finished. Visible here in dev only.",
    topic: "Rookies",
    date: "2026-09-30",
    readMinutes: 4,
    myTake: "",
    status: "draft",
    body: [],
  },
];

/** Drafts are for the kitchen table, not for visitors. */
export function publishedPosts(): Post[] {
  return posts.filter((p) => p.status === "published");
}

/**
 * What the column index shows. Drafts appear in development so the next
 * piece is reviewable, and never in a production build.
 */
export function visiblePosts(): Post[] {
  return process.env.NODE_ENV === "production" ? publishedPosts() : posts;
}

export function getPost(slug: string): Post | undefined {
  return visiblePosts().find((p) => p.slug === slug);
}

export function latestPost(): Post {
  return publishedPosts()[0];
}
